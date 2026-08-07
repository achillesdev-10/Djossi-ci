#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/tests/test_similarity_check.py
  Tests unitaires du contrôle anti-duplication (PARTIE 2 — §2.6)

  Vérifie que la mesure de similarité :
    • renvoie ~1.0 pour un texte identique (copie) ;
    • dépasse le seuil pour une reformulation trop fidèle ;
    • reste sous le seuil pour une vraie réécriture ;
    • est insensible à la casse, aux accents et au Markdown.

  Usage : python scraper/tests/test_similarity_check.py
===============================================================================
"""

from __future__ import annotations

import io
import sys
from pathlib import Path


def _fix_console() -> None:
    """Console Windows (cp1252) : force UTF-8 pour les emojis de rapport."""
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        sys.stdout = io.TextIOWrapper(
            sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
        )
        sys.stderr = io.TextIOWrapper(
            sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True
        )


_fix_console()

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scraper.core.similarity_check import (  # noqa: E402
    SIMILARITY_THRESHOLD,
    needs_rewrite,
    text_similarity,
)

SOURCE = (
    "Les inscriptions en ligne débuteront le 15 août 2026 pour prendre fin le "
    "15 septembre 2026. Peuvent faire acte de candidature les personnes de "
    "nationalité ivoirienne âgées de 18 ans au moins et de 35 ans au plus au "
    "31 décembre 2026, titulaires d'un diplôme de licence. Les frais "
    "d'inscription sont fixés à 10 000 FCFA."
)


def _assert_close(actual: float, expected: float, tolerance: float = 0.05) -> None:
    assert abs(actual - expected) <= tolerance, f"{actual} != {expected} (±{tolerance})"


def test_identical_text_is_full_similarity() -> None:
    score = text_similarity(SOURCE, SOURCE)
    _assert_close(score, 1.0)
    assert needs_rewrite(SOURCE, SOURCE)


def test_markdown_and_case_are_ignored() -> None:
    """Une réécriture avec Markdown/accents différents mais même fond = copie."""
    rewritten = (
        "# Inscriptions\n\nLes **inscriptions en ligne** débuteront le 15 août "
        "2026 pour prendre fin le 15 septembre 2026. Peuvent faire acte de "
        "candidature les personnes de nationalité ivoirienne âgées de 18 ans au "
        "moins et de 35 ans au plus au 31 décembre 2026, titulaires d'un "
        "diplôme de licence. Les frais d'inscription sont fixés à 10 000 FCFA."
    )
    score = text_similarity(SOURCE, rewritten)
    assert score > SIMILARITY_THRESHOLD, f"copie non détectée (score={score:.2f})"


def test_full_rewrite_is_below_threshold() -> None:
    """Une vraie reformulation (structure + mots différents) passe le contrôle."""
    rewritten = (
        "Le guichet unique des concours administratifs annonce l'ouverture de la "
        "campagne 2026. Les candidatures seront reçues en ligne à partir de la "
        "mi-août et jusqu'à la mi-septembre. Ce recrutement concerne les "
        "ressortissants ivoiriens, âgés de 18 à 35 ans à la fin de l'année et "
        "justifiant d'un niveau Bac+3 minimum. Un droit de dossier de 10 000 "
        "FCFA est demandé aux candidats."
    )
    score = text_similarity(SOURCE, rewritten)
    assert score < SIMILARITY_THRESHOLD, f"vraie réécriture rejetée (score={score:.2f})"


def test_totally_different_texts() -> None:
    score = text_similarity(SOURCE, "Le concours CAFOP 2026 est ouvert aux titulaires du BEPC.")
    assert score < 0.5


def test_partial_copy_of_long_source_is_detected() -> None:
    """Une copie partielle d'une source LONGUE doit être détectée (couverture
    directionnelle : part des n-grams de la réécriture présents dans la source)."""
    long_source = (
        "Navigation, liens utiles, actualités et présentation du ministère. " * 12
        + SOURCE
        + " Contact, mentions légales et plan du site. " * 5
    )
    score = text_similarity(long_source, SOURCE)
    assert score > SIMILARITY_THRESHOLD, f"copie partielle non détectée (score={score:.2f})"


def test_needs_rewrite_helper() -> None:
    assert needs_rewrite(SOURCE, SOURCE)
    assert not needs_rewrite(
        SOURCE,
        "Ouverture de la campagne 2026 : candidatures en ligne de mi-août à "
        "mi-septembre pour les Ivoiriens de 18 à 35 ans titulaires d'une licence.",
    )


def test_empty_inputs() -> None:
    assert text_similarity("", "") == 0.0
    assert text_similarity(SOURCE, "") == 0.0
    assert not needs_rewrite("", "")


def _run() -> int:
    tests = [
        (name, fn)
        for name, fn in sorted(globals().items())
        if name.startswith("test_") and callable(fn)
    ]
    failures = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  ✅ {name}")
        except AssertionError as exc:
            failures += 1
            print(f"  ❌ {name}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print(f"  ❌ {name}: erreur inattendue {exc!r}")
    print(f"\n{len(tests) - failures}/{len(tests)} tests OK.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(_run())
