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
