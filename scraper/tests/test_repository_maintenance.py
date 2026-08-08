#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/tests/test_repository_maintenance.py
  Tests unitaires de la maintenance automatique du repository (job_offers)

  Couvre les deux nouvelles règles :
    1. `auto_publish_pending()` : les contenus restés en 'pending' depuis plus
       de 21 minutes sont validés (status='published', is_verified=1) — même
       quand l'admin ne se connecte pas.
    2. `purge_old_offers()` : les offres âgées de plus de 21 jours avec
       deadline passée OU absente sont supprimées ; une offre avec une
       deadline encore dans le futur est conservée.

  Usage :  python scraper/tests/test_repository_maintenance.py
===============================================================================
"""

from __future__ import annotations

import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scraper.database.repository import JobRepository  # noqa: E402
from scraper.database.exam_repository import ExamRepository  # noqa: E402
from scraper.models.content_item import ContentItem  # noqa: E402
from scraper.models.exam_item import ExamItem  # noqa: E402


def make_item(title: str, source_url: str) -> ContentItem:
    return ContentItem(
        title=title,
        company="TestCo",
        location="Abidjan",
        description="Description de test suffisamment longue pour valider le modele.",
        application_url=f"https://test.ci/{source_url}",
        source_url=f"https://test.ci/{source_url}",
        source="TestSource",
    )


def set_created_at(repo: JobRepository, title: str, when: datetime) -> None:
    repo.conn.execute(
        "UPDATE job_offers SET created_at = ? WHERE title = ?",
        (when.isoformat(), title),
    )


def test_auto_publish_after_21_minutes():
    with tempfile.TemporaryDirectory() as td:
        with JobRepository(Path(td) / "test.sqlite3") as repo:
            # Une offre récente (< 21 min) : doit rester en attente.
            repo.upsert(make_item("offre_recente", "recente"))
            set_created_at(repo, "offre_recente", datetime.now())
            # Une offre ancienne (> 21 min) : doit être publiée automatiquement.
            repo.upsert(make_item("offre_ancienne", "ancienne"))
            set_created_at(repo, "offre_ancienne", datetime.now() - timedelta(minutes=40))
            # Une offre déjà publiée : inchangée.
            repo.upsert(make_item("deja_publiee", "publiee"))
            set_created_at(repo, "deja_publiee", datetime.now() - timedelta(hours=2))
            repo.conn.execute(
                "UPDATE job_offers SET status = 'published', is_verified = 1 "
                "WHERE title = 'deja_publiee'"
            )
            repo.conn.commit()

            n = repo.auto_publish_pending()

            assert n == 1, f"1 seule offre éligible attendue, obtenu {n}"
            rows = {
                r["title"]: (r["status"], r["is_verified"])
                for r in repo.conn.execute(
                    "SELECT title, status, is_verified FROM job_offers"
                ).fetchall()
            }
            assert rows["offre_ancienne"] == ("published", 1), rows["offre_ancienne"]
            assert rows["offre_recente"] == ("pending", 0), rows["offre_recente"]
            assert rows["deja_publiee"] == ("published", 1), rows["deja_publiee"]


def test_auto_publish_keeps_manual_moderation_window():
    """Une offre de moins de 21 minutes ne doit jamais être publiée en force."""
    with tempfile.TemporaryDirectory() as td:
        with JobRepository(Path(td) / "test.sqlite3") as repo:
            repo.upsert(make_item("fraiche", "fraiche"))
            set_created_at(repo, "fraiche", datetime.now())

            n = repo.auto_publish_pending(max_age_minutes=21)

            assert n == 0, "aucune offre ne doit être publiée avant 21 minutes"
            row = repo.conn.execute(
                "SELECT status, is_verified FROM job_offers WHERE title = 'fraiche'"
            ).fetchone()
            assert row["status"] == "pending"
            assert row["is_verified"] == 0


def test_purge_after_21_days():
    with tempfile.TemporaryDirectory() as td:
        with JobRepository(Path(td) / "test.sqlite3") as repo:
            # Vieille sans deadline : supprimée.
            repo.upsert(make_item("vieille", "vieille"))
            set_created_at(repo, "vieille", datetime.now() - timedelta(days=30))
            # Vieille avec deadline passée : supprimée.
            repo.upsert(make_item("vieille_expiree", "vieille-expiree"))
            set_created_at(repo, "vieille_expiree", datetime.now() - timedelta(days=30))
            repo.conn.execute(
                "UPDATE job_offers SET deadline = ? WHERE title = 'vieille_expiree'",
                ((datetime.now() - timedelta(days=1)).isoformat(),),
            )
            # Vieille mais deadline encore dans le futur : CONSERVÉE.
            repo.upsert(make_item("vieille_active", "vieille-active"))
            set_created_at(repo, "vieille_active", datetime.now() - timedelta(days=30))
            repo.conn.execute(
                "UPDATE job_offers SET deadline = ? WHERE title = 'vieille_active'",
                ((datetime.now() + timedelta(days=10)).isoformat(),),
            )
            # Récente : conservée.
            repo.upsert(make_item("recente", "recente-2"))
            repo.conn.commit()

            n = repo.purge_old_offers()

            assert n == 2, f"2 offres éligibles attendues, obtenu {n}"
            remaining = [
                r["title"]
                for r in repo.conn.execute("SELECT title FROM job_offers").fetchall()
            ]
            assert "vieille" not in remaining
            assert "vieille_expiree" not in remaining
            assert "vieille_active" in remaining, "deadline future = offre conservée"
            assert "recente" in remaining


def test_purge_respects_age_threshold():
    """Une offre de 20 jours ne doit pas être supprimée (seuil : 21 jours)."""
    with tempfile.TemporaryDirectory() as td:
        with JobRepository(Path(td) / "test.sqlite3") as repo:
            repo.upsert(make_item("vingt_jours", "vingt"))
            set_created_at(repo, "vingt_jours", datetime.now() - timedelta(days=20))

            n = repo.purge_old_offers()

            assert n == 0, "aucune suppression avant 21 jours"
            row = repo.conn.execute(
                "SELECT COUNT(*) AS n FROM job_offers WHERE title = 'vingt_jours'"
            ).fetchone()
            assert row["n"] == 1


def make_exam_item(title: str, source_url: str) -> ExamItem:
    return ExamItem(
        title=title,
        organizer="ENA Test",
        category="administratif",
        description_md="Description de test suffisamment longue pour valider le modele.",
        registration_start=datetime.now() - timedelta(days=5),
        registration_end=datetime.now() + timedelta(days=10),
        source_url=source_url,
    )


def set_exam_created_at(repo: ExamRepository, title: str, when: datetime) -> None:
    repo.conn.execute(
        "UPDATE exams SET created_at = ? WHERE title = ?",
        (when.isoformat(), title),
    )


def test_purge_old_exams_after_5_weeks():
    """Les informations concours durent 5 semaines (35 jours)."""
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            # Vieille fiche (> 35 j) avec fin d'inscription passée : supprimée.
            repo.upsert(make_exam_item("Concours ENA ancien", "https://t.ci/exam-1"))
            set_exam_created_at(repo, "Concours ENA ancien", datetime.now() - timedelta(days=45))
            repo.conn.execute(
                "UPDATE exams SET registration_end = ? WHERE title = 'Concours ENA ancien'",
                ((datetime.now() - timedelta(days=2)).isoformat(),),
            )
            # Vieille fiche (> 35 j) sans fin d'inscription : supprimée.
            repo.upsert(make_exam_item("Concours INFAS ancien", "https://t.ci/exam-2"))
            set_exam_created_at(repo, "Concours INFAS ancien", datetime.now() - timedelta(days=50))
            repo.conn.execute(
                "UPDATE exams SET registration_end = NULL WHERE title = 'Concours INFAS ancien'"
            )
            # Vieille fiche mais inscriptions encore ouvertes : CONSERVÉE.
            repo.upsert(make_exam_item("Concours CAFOP ouvert", "https://t.ci/exam-3"))
            set_exam_created_at(repo, "Concours CAFOP ouvert", datetime.now() - timedelta(days=50))
            # Fiche récente : conservée.
            repo.upsert(make_exam_item("Concours récent", "https://t.ci/exam-4"))
            repo.conn.commit()

            n = repo.purge_old_exams()

            assert n == 2, f"2 fiches éligibles attendues, obtenu {n}"
            remaining = [
                r["title"] for r in repo.conn.execute("SELECT title FROM exams").fetchall()
            ]
            assert "Concours ENA ancien" not in remaining
            assert "Concours INFAS ancien" not in remaining
            assert "Concours CAFOP ouvert" in remaining, "concours toujours ouvert = conservé"
            assert "Concours récent" in remaining


if __name__ == "__main__":
    import traceback

    # Console Windows : forcer UTF-8 pour les symboles ✓/✗.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    tests = [
        fn for name, fn in sorted(globals().items())
        if name.startswith("test_") and callable(fn)
    ]
    failures = 0
    for fn in tests:
        try:
            fn()
            print(f"  OK {fn.__name__}")
        except Exception:
            failures += 1
            print(f"  FAIL {fn.__name__}")
            traceback.print_exc()
    print(f"\n{len(tests) - failures}/{len(tests)} tests OK")
    sys.exit(1 if failures else 0)
