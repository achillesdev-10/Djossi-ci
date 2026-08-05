#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/core/utils.py
  Utilitaires de normalisation (HTML, dates, devises, diplômes, contrats,
  entreprise, lieu, date limite)
===============================================================================
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional
from bs4 import BeautifulSoup
from dateutil import parser as date_parser


def clean_html_text(html_content: str | BeautifulSoup) -> str:
    if not html_content:
        return ""
    soup = html_content if isinstance(html_content, BeautifulSoup) else BeautifulSoup(str(html_content), "lxml")
    for tag in soup.find_all(["script", "style", "noscript", "iframe", "nav", "footer"]):
        tag.decompose()
    return soup.get_text("\n", strip=True)


# -----------------------------------------------------------------------------
# Villes ivoiriennes : forme canonique (casse + accents) et communes d'Abidjan.
# -----------------------------------------------------------------------------
_CITY_CANONICAL = {
    "abidjan": "Abidjan",
    "yamoussoukro": "Yamoussoukro",
    "bouake": "Bouaké",
    "bouaké": "Bouaké",
    "san-pedro": "San-Pédro",
    "san pedro": "San-Pédro",
    "sanpedro": "San-Pédro",
    "sampedro": "San-Pédro",
    "daloa": "Daloa",
    "korhogo": "Korhogo",
    "man": "Man",
    "gagnoa": "Gagnoa",
    "bouafle": "Bouaflé",
    "bouaflé": "Bouaflé",
    "soubre": "Soubré",
    "soubré": "Soubré",
    "abengourou": "Abengourou",
    "duékoué": "Duékoué",
    "duekoue": "Duékoué",
    "séguéla": "Séguéla",
    "seguela": "Séguéla",
    "bondoukou": "Bondoukou",
    "dabou": "Dabou",
    "agboville": "Agboville",
    "grand-bassam": "Grand-Bassam",
    "grand bassam": "Grand-Bassam",
    "divo": "Divo",
    "odienne": "Odienné",
    "odienné": "Odienné",
    "katiola": "Katiola",
    "ferkessedougou": "Ferkessédougou",
}

_COMMUNES_ABIDJAN = {
    "abobo": "Abobo",
    "cocody": "Cocody",
    "plateau": "Plateau",
    "treichville": "Treichville",
    "koumassi": "Koumassi",
    "yopougon": "Yopougon",
    "marcory": "Marcory",
    "adjame": "Adjamé",
    "adjamé": "Adjamé",
    "anyama": "Anyama",
    "bingerville": "Bingerville",
    "port-bouet": "Port-Bouët",
    "port bouet": "Port-Bouët",
    "port-bouët": "Port-Bouët",
    "riviera": "Riviera",
    "riviera palmeraie": "Riviera-Palmeraie",
}

_CITY_PATTERN = (
    r"\b(abidjan|yamoussoukro|bouak[eé]|bouafl[eé]|san[\s-]?p[eé]dro|sanpedro|sampedro|daloa|korhogo|"
    r"man|gagnoa|soubr[eé]|abengourou|du[eé]kou[eé]|s[eé]gu[eé]la|bondoukou|dabou|agboville|"
    r"grand[\s-]?bassam|divo|odienn[eé]|katiola|ferkess[eé]dougou|"
    r"abobo|cocody|plateau|treichville|koumassi|yopougon|marcory|adjam[eé]|anyama|bingerville|"
    r"port[\s-]bou[eë]t|riviera[\s-]?palmeraie)\b"
)


def normalize_location(text: str) -> str:
    """Extrait et normalise le lieu d'une offre (Abidjan - Cocody, Bouaké, …)."""
    match = re.search(_CITY_PATTERN, text, re.I)
    if not match:
        return "Abidjan"
    raw = match.group(1).lower().strip()
    if raw in _COMMUNES_ABIDJAN:
        return f"Abidjan - {_COMMUNES_ABIDJAN[raw]}"
    if raw in _CITY_CANONICAL:
        return _CITY_CANONICAL[raw]
    return raw.capitalize()


def extract_education(text: str) -> Optional[str]:
    text_lower = text.lower()
    if "doctorat" in text_lower or "phd" in text_lower:
        return "Doctorat"
    if "bac+5" in text_lower or "master" in text_lower or "ingénieur" in text_lower or "ingenieur" in text_lower or "dess" in text_lower or "dea" in text_lower:
        return "BAC+5"
    if "bac+4" in text_lower or "maîtrise" in text_lower or "maitrise" in text_lower:
        return "BAC+4"
    if "bac+3" in text_lower or "licence" in text_lower or "bachelor" in text_lower:
        return "BAC+3"
    if "bac+2" in text_lower or "bts" in text_lower or "dut" in text_lower or "deug" in text_lower:
        return "BAC+2"
    if "bac" in text_lower:
        return "BAC"
    return None


def extract_contract(text: str) -> str:
    t = text.lower()
    if "cdd" in t or "déterminé" in t or "determine" in t:
        return "CDD"
    if "stage" in t or "internship" in t or "stagiaire" in t:
        return "Stage"
    if "alternance" in t or "apprentissage" in t:
        return "Alternance"
    if "freelance" in t or "consultant" in t or "prestation" in t:
        return "Freelance"
    return "CDI"


def guess_company(text: str, default: str = "Entreprise") -> str:
    """Devine le nom de l'entreprise à partir d'un texte d'annonce.

    Priorités :
      1. « <Entreprise> recrute / recherche / embauche … » (EmploiIvoire & co).
      2. « Recruteur confidentiel » (JobIvoire).
      3. Retourne `default`.
    """
    if not text:
        return default
    m = re.search(r"\b(.{3,80}?)\s+(recrute|recherche|embauche)\b", text, re.I)
    if m:
        company = m.group(1).strip().rstrip(":,;-–—|").strip()
        company = re.sub(r"^(exclusif|nouveau|nouvelle|urgent|urgence|stages?|emplois?)\b", "", company, flags=re.I).strip()
        company = re.sub(r"^(niveau\s+bac\+?\d*)\b", "", company, flags=re.I).strip()
        company = re.sub(r"^[\d\s\W]+", "", company).strip()
        if company:
            return company[:80]
    if "recruteur confidentiel" in text.lower():
        return "Recruteur confidentiel"
    return default


def guess_company_from_card(text: str, title: str | None = None, default: str = "Entreprise") -> str:
    """Extrait l'entreprise d'une carte d'offre du type Novojob :
    « Titre — ENTREPRISE — Ville, Côte d'ivoire — date — expérience »."""
    rest = text
    if title and text.lower().startswith(title.lower()):
        rest = text[len(title):]
    rest = rest.strip(" \t\r\n–—|-·•")
    m = re.search(_CITY_PATTERN, rest, re.I)
    if m:
        rest = rest[:m.start()].strip(" \t\r\n–—|-·•")
    company = rest.strip(" \t\r\n–—|-·•")[:80]
    if len(company) >= 2:
        return company
    return guess_company(text, default)


def extract_deadline(text: str) -> Optional[datetime]:
    """Extrait une date limite de candidature depuis un texte d'annonce.

    Formes reconnues :
      « expire le 30/08/2026 » (RMO), « Date limite : 05/09/2026 »,
      « Dernier délai : 05/10/2026 » (JobIvoire), « Candidatures jusqu'au 10/10/2026 »…
    """
    if not text:
        return None
    date_num = r"([0-9]{1,2}[/.\-][0-9]{1,2}[/.\-][0-9]{2,4})"
    patterns = [
        rf"expire\s+le\s+{date_num}",
        rf"date\s*limite\s*:?\s*{date_num}",
        rf"(?:dernier|derniere)\s+d[ée]lai\s*:?\s*{date_num}",
        rf"d[ée]lai\s*de\s*(?:candidature|dep[ôo]t)?\s*:?\s*{date_num}",
        rf"candidatures?\s*(?:jusqu['’ ]au|jusqu['’ ]a|avant|au)\s+{date_num}",
        rf"fin\s*(?:de\s*)?(?:candidature|recrutement)\s*:?\s*{date_num}",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            try:
                return date_parser.parse(m.group(1), dayfirst=True)
            except Exception:
                return None
    return None
