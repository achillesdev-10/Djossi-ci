#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/tests/test_exam_parser.py
  Tests unitaires du parseur de communiqués (exam_parser.py)

  Les 4 communiqués ci-dessous reproduisent les structures rédactionnelles
  types des avis de concours ivoiriens (voir docs/CONCOURS_SOURCES.md) :
    Ex.1 Concours administratifs (Fonction Publique)
    Ex.2 Concours ENA
    Ex.3 Concours militaire / gendarmerie (Ministère de la Défense)
    Ex.4 Concours INFAS / santé (plusieurs filières)

  Usage :  python -m pytest scraper/tests -q
           (ou) python scraper/tests/test_exam_parser.py
===============================================================================
"""

from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scraper.core.exam_parser import (  # noqa: E402
    confidence_from_gaps,
    guess_category,
    parse_communique,
    parse_french_date,
)
from scraper.models.exam_item import (  # noqa: E402
    ExamItem,
    compute_min_diploma_level,
    diploma_level,
)

# ---------------------------------------------------------------------------
# Exemples de communiqués (structures types réelles)
# ---------------------------------------------------------------------------

COMMUNIQUE_ADMIN = """\
AVIS DE CONCOURS — Ministère de la Fonction Publique

13 concours administratifs sont ouverts dont 9 concours de recrutement nouveau
et 4 concours de promotion. Les inscriptions en ligne débuteront le 15 septembre
2026 pour prendre fin le 15 octobre 2026 sur la plateforme gucaci.ciconcours.com.

Pour les concours donnant accès aux emplois de grades D1 à A3, l'âge maximum
est de 35 ans et pour les concours donnant accès au grade A4, l'âge maximum
est de 40 ans. Peuvent faire acte de candidature les personnes de nationalité
ivoirienne titulaires du BEPC, du BAC ou de la Licence selon le grade visé.
"""

COMMUNIQUE_ENA = """\
COMMUNIQUÉ — Concours direct ENA, cycle moyen

Les inscriptions au concours direct d'entrée à l'École Nationale d'Administration
se font du 1er septembre 2026 au 30 septembre 2026. Peuvent faire acte de
candidature les personnes de nationalité ivoirienne âgées de 18 ans au moins et
de 32 ans au plus au 31 décembre 2026, et titulaires d'un BAC. Les inscriptions
se font en ligne sur les sites www.fonctionpublique.gouv.ci et www.ena.ci.
Les frais d'inscription sont fixés à 10 000 Fcfa.
"""

COMMUNIQUE_MILITAIRE = """\
AVIS DE RECRUTEMENT — Ministère de la Défense

Les inscriptions au concours de sous-officiers de l'Armée de Terre se dérouleront
du 10 octobre 2026 au 10 novembre 2026, exclusivement en ligne sur la plateforme
officielle. Ce concours s'adresse aux jeunes ivoiriens âgés de 18 à 26 ans au
31 décembre 2026 et titulaires du BEPC ou d'un diplôme équivalent. Les épreuves
écrites sont prévues pour le 5 décembre 2026. La visite médicale se fera du
15 décembre 2026 au 20 décembre 2026.
"""

COMMUNIQUE_INFAS = """\
COMMUNIQUÉ — Préinscription aux concours INFAS 2026

Les candidats intéressés pourront effectuer leur préinscription en ligne à
partir du 20 août 2026 jusqu'au 20 septembre 2026 sur le site officiel
infas.ciconcours.com. La phase d'inscription se déroulera du 25 septembre 2026
au 30 septembre 2026. Des inscriptions délocalisées sont prévues du 1er octobre
2026 au 5 octobre 2026 dans plusieurs villes : Abidjan, Bouaké, Korhogo, Daloa.

4 filières de formation sont accessibles aux titulaires du BAC, du BTS ou de la
Licence selon les spécialités : infirmier, sage-femme, technicien supérieur de
santé et secrétaire médical.
"""


def test_parse_french_date():
    assert parse_french_date("le 15 septembre 2026") == datetime(2026, 9, 15)
    assert parse_french_date("du 15/08/2026") == datetime(2026, 8, 15)
    assert parse_french_date("aucune date ici") is None


def test_communique_administratif():
    fields = parse_communique(COMMUNIQUE_ADMIN, default_organizer="Ministère de la Fonction Publique")
    assert fields["category"] == "administratif"
    assert fields["exam_type"] == "recrutement_nouveau"
    assert fields["organizer"] == "Ministère de la Fonction Publique"
    assert fields["registration_start"] == datetime(2026, 9, 15)
    assert fields["registration_end"] == datetime(2026, 10, 15)
    assert fields["positions_count"] == 13
    assert "BEPC" in fields["diplomas"] and "BAC" in fields["diplomas"]
    assert fields["nationality"] == "ivoirienne"


def test_communique_ena():
    fields = parse_communique(COMMUNIQUE_ENA, default_organizer="ENA")
    assert fields["category"] == "administratif"
    assert fields["exam_type"] == "concours_direct"
    assert fields["registration_start"] == datetime(2026, 9, 1)
    assert fields["registration_end"] == datetime(2026, 9, 30)
    assert fields["age_min"] == 18
    assert fields["age_max"] == 32
    assert fields["age_reference_date"] == "au 31 décembre 2026"
    assert fields["nationality"] == "ivoirienne"
    assert "BAC" in fields["diplomas"]
    assert fields["registration_fee"] == "10 000 FCFA"


def test_communique_militaire():
    fields = parse_communique(COMMUNIQUE_MILITAIRE, default_organizer="Ministère de la Défense")
    assert fields["category"] == "militaire"
    assert fields["registration_start"] == datetime(2026, 10, 10)
    assert fields["registration_end"] == datetime(2026, 11, 10)
    assert fields["age_min"] == 18
    assert fields["age_max"] == 26
    assert fields["age_reference_date"] == "au 31 décembre 2026"
    assert fields["exam_date"] == datetime(2026, 12, 5)
    assert "BEPC" in fields["diplomas"]


def test_communique_infas():
    fields = parse_communique(COMMUNIQUE_INFAS, default_organizer="INFAS", default_category="sante")
    assert fields["category"] == "sante"
    assert fields["registration_start"] == datetime(2026, 8, 20)
    assert fields["registration_end"] == datetime(2026, 9, 20)
    assert "BAC" in fields["diplomas"] and "BTS" in fields["diplomas"]
    assert fields["positions_count"] == 4


def test_guess_category():
    assert guess_category("concours infirmier INFAS 2026") == "sante"
    assert guess_category("concours CAFOP instituteurs") == "enseignement"
    assert guess_category("recrutement gendarmerie nationale") == "militaire"
    assert guess_category("concours ENA cycle moyen") == "administratif"
    assert guess_category("recrutement de la police nationale") == "securite"


def test_diploma_levels():
    assert diploma_level("CEPE") == 1
    assert diploma_level("BEPC") == 2
    assert diploma_level("BAC") == 4
    assert diploma_level("LICENCE") == 6
    assert diploma_level("MASTER") == 7
    assert diploma_level("Licence Pro") == 6  # normalisation
    assert diploma_level("inconnu") is None
    assert compute_min_diploma_level(["BAC", "LICENCE"]) == 4
    assert compute_min_diploma_level([]) is None


def test_confidence_gaps():
    assert confidence_from_gaps({"a": 1, "b": 2, "c": 3, "d": 4, "e": 5, "f": 6}) == "high"
    assert confidence_from_gaps({"a": 1, "b": 2}) == "low"


def test_exam_item_normalization():
    item = ExamItem(
        title="Concours direct ENA",
        organizer="ENA",
        description_md="Les inscriptions se font du 1er septembre 2026 au 30 septembre 2026.",
        source_url="https://www.ena.ci/concours",
        diplomas=["bac", "Licence Pro"],
        category="administratif",
    )
    assert item.diplomas == ["BAC", "LICENCE PRO"]
    assert item.min_diploma_level == 4
    assert item.confidence == "medium"
    ok, _ = item.is_valid()
    assert ok


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
