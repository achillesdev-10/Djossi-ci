#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/tests/test_exam_repository.py
  Tests unitaires du repository des concours (exam_repository.py)

  Régression : deux bugs ont cassé le pipeline en production —
    1. « Incorrect number of bindings supplied » (UPDATE : 29 placeholders
       pour 30 valeurs, le champ `status` manquait) ;
    2. bloc INSERT devenu inatteignable (indenté dans la branche `if row:`
       après le `return`), aucun nouveau concours n'était plus enregistré.

  Ces tests couvrent les trois chemins de `upsert()` :
     - INSERT (nouveau concours) ;
     - UPDATE par déduplication source_url ;
     - UPDATE par déduplication titre + organisateur.

  Usage :  python scraper/tests/test_exam_repository.py
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

from scraper.database.exam_repository import ExamRepository  # noqa: E402
from scraper.models.exam_item import ExamItem  # noqa: E402


def make_item(source_url: str, title: str, status: str = "pending") -> ExamItem:
    return ExamItem(
        title=title,
        organizer="ENA Test",
        category="administratif",
        description_md=(
            "Description de test suffisamment longue pour valider le modele "
            "du repository des concours."
        ),
        registration_start=datetime.now() - timedelta(days=10),
        registration_end=datetime.now() + timedelta(days=30),
        source_url=source_url,
        status=status,
    )


def test_insert_new_exam():
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            exam_id, is_new = repo.upsert(
                make_item("https://example.com/concours-1", "Concours test ENA")
            )
            assert is_new is True, "un nouveau concours doit être INSÉRÉ"
            assert exam_id, "l'INSERT doit retourner un id"
            row = repo.conn.execute(
                "SELECT title, status FROM exams WHERE id = ?", (exam_id,)
            ).fetchone()
            assert row["title"] == "Concours test ENA"
            assert row["status"] == "pending"


def test_update_existing_by_source_url():
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            url = "https://example.com/concours-2"
            id1, _ = repo.upsert(make_item(url, "Concours test ENA"))
            id2, is_new = repo.upsert(
                make_item(url, "Concours test ENA (mis a jour)", status="published")
            )
            assert is_new is False, "déduplication par source_url doit METTRE À JOUR"
            assert id2 == id1, "l'UPDATE doit conserver le même id"
            row = repo.conn.execute(
                "SELECT title, status FROM exams WHERE id = ?", (id1,)
            ).fetchone()
            assert row["title"] == "Concours test ENA (mis a jour)"
            assert row["status"] == "published"


def test_update_existing_by_title_organizer():
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            id1, _ = repo.upsert(make_item("https://example.com/concours-3", "Concours test ENA"))
            id2, is_new = repo.upsert(
                make_item("https://example.com/concours-3-bis", "Concours test ENA", status="published")
            )
            assert is_new is False, "déduplication par titre+organisateur doit METTRE À JOUR"
            assert id2 == id1, "l'UPDATE doit conserver le même id"
            count = repo.conn.execute("SELECT COUNT(*) AS n FROM exams").fetchone()["n"]
            assert count == 1, "aucune ligne supplémentaire ne doit être créée"


def test_two_distinct_exams():
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            id1, _ = repo.upsert(make_item("https://example.com/concours-a", "Concours A"))
            id2, _ = repo.upsert(make_item("https://example.com/concours-b", "Concours B"))
            assert id1 != id2
            count = repo.conn.execute("SELECT COUNT(*) AS n FROM exams").fetchone()["n"]
            assert count == 2


def test_dedup_title_case_insensitive():
    """« CONCOURS ADMINISTRATIFS 2026 » et « concours administratifs 2026 » = même fiche,
    même si les URLs diffèrent (règle 2 : titre + organisateur + domaine, insensibles à la casse)."""
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            id1, is_new = repo.upsert(
                make_item("https://gucaci.ciconcours.com/concours-2026", "CONCOURS ADMINISTRATIFS 2026")
            )
            assert is_new is True
            id2, is_new = repo.upsert(
                make_item("https://gucaci.ciconcours.com/concours-2026/ena", "concours administratifs 2026")
            )
            assert is_new is False, "intitulé identique (casse différente) = mise à jour"
            assert id2 == id1
            count = repo.conn.execute("SELECT COUNT(*) AS n FROM exams").fetchone()["n"]
            assert count == 1


def test_url_tracking_params_normalized():
    """Deux URLs ne différant que par un paramètre de suivi = même fiche (règle 1)."""
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            url = "https://gucaci.ciconcours.com/concours-2026"
            id1, _ = repo.upsert(make_item(url, "Concours tracking"))
            id2, is_new = repo.upsert(make_item(url + "?utm_source=x&ref=y", "Concours tracking"))
            assert is_new is False
            assert id2 == id1
            count = repo.conn.execute("SELECT COUNT(*) AS n FROM exams").fetchone()["n"]
            assert count == 1


def test_dedup_title_same_domain_keeps_most_specific_url():
    """Deux sources scrapant le même intitulé sur le même domaine : une seule fiche,
    et l'URL de détail gagne face à la page d'accueil (cas du doublon constaté en prod)."""
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            detail_url = "https://gucaci.ciconcours.com/comment-sinscrire/procedure/ena-professionnels"
            home_url = "https://gucaci.ciconcours.com/"
            id_detail, _ = repo.upsert(
                make_item(detail_url, "CONCOURS ADMINISTRATIFS 2026")
            )
            # Autre source (ex. ENA) scrapant la page d'accueil GUCACI : même
            # intitulé, même domaine, mais organisateur DIFFÉRENT → règle 3.
            item_ena = make_item(home_url, "CONCOURS ADMINISTRATIFS 2026")
            item_ena.organizer = "École Nationale d'Administration (ENA)"
            id_home, is_new = repo.upsert(item_ena)
            assert is_new is False, "intitulé identique sur le même domaine = dédup"
            assert id_home == id_detail
            row = repo.conn.execute(
                "SELECT source_url, organizer FROM exams WHERE id = ?", (id_detail,)
            ).fetchone()
            assert row["source_url"] == detail_url, "l'URL de détail doit être conservée"
            assert row["organizer"] == "ENA Test", "l'organisateur de la fiche en place ne doit pas être écrasé"
            count = repo.conn.execute("SELECT COUNT(*) AS n FROM exams").fetchone()["n"]
            assert count == 1


def test_id_never_null_on_insert():
    """Régression : l'INSERT génère un UUID explicite — plus jamais de ligne id NULL."""
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            exam_id, _ = repo.upsert(make_item("https://example.com/concours-id", "Concours ID"))
            assert exam_id, "l'id doit être non vide"
            row = repo.conn.execute(
                "SELECT id FROM exams WHERE id = ?", (exam_id,)
            ).fetchone()
            assert row is not None and row["id"], "l'id doit exister en base"


def test_source_url_normalized_on_insert():
    """Les URLs sources sont stockées normalisées (hôte minuscules, sans fragment/tracking)."""
    with tempfile.TemporaryDirectory() as td:
        with ExamRepository(Path(td) / "test.sqlite3") as repo:
            exam_id, _ = repo.upsert(
                make_item(
                    "https://GUCACI.ciconcours.com/Concours-2026?utm_source=news&ref=x#section",
                    "Concours normalisé",
                )
            )
            row = repo.conn.execute(
                "SELECT source_url FROM exams WHERE id = ?", (exam_id,)
            ).fetchone()
            assert row["source_url"] == "https://gucaci.ciconcours.com/Concours-2026", row["source_url"]


if __name__ == "__main__":
    import traceback

    # Console Windows : forcer UTF-8 pour les symboles ✓/✗.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    tests = [fn for name, fn in sorted(globals().items()) if name.startswith("test_") and callable(fn)]
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
