#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/core/utils.py
  Utilitaires de normalisation (HTML, dates, devises, diplômes, contrats)
===============================================================================
"""

from __future__ import annotations

import re
from datetime import datetime
from bs4 import BeautifulSoup
from dateutil import parser as date_parser


def clean_html_text(html_content: str | BeautifulSoup) -> str:
    if not html_content:
        return ""
    soup = html_content if isinstance(html_content, BeautifulSoup) else BeautifulSoup(str(html_content), "lxml")
    for tag in soup.find_all(["script", "style", "noscript", "iframe", "nav", "footer"]):
        tag.decompose()
    return soup.get_text("\n", strip=True)


def extract_education(text: str) -> Optional[str]:
    text_lower = text.lower()
    if "doctorat" in text_lower or "phd" in text_lower:
        return "Doctorat"
    if "bac+5" in text_lower or "master" in text_lower or "ingénieur" in text_lower or "ingenieur" in text_lower or "DESS" in text_lower or "DEA" in text_lower:
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
    if "cdd" in t or "déterminé" in t:
        return "CDD"
    if "stage" in t or "internship" in t:
        return "Stage"
    if "alternance" in t or "apprentissage" in t:
        return "Alternance"
    if "freelance" in t or "consultant" in t or "prestation" in t:
        return "Freelance"
    return "CDI"


def normalize_location(text: str) -> str:
    match = re.search(
        r"\b(Abidjan|Yamoussoukro|Bouaké|San[\s-]?Pedro|Daloa|Korhogo|Man|Gagnoa|Abobo|Cocody|Plateau|Treichville|Port[\s-]Bouët|Koumassi|Adjamé|Yopougon|Marcory|Anyama|Bingerville)\b",
        text,
        re.I
    )
    if match:
        city = match.group(1)
        if city.lower() in {"plateau", "cocody", "abobo", "treichville", "koumassi", "yopougon", "marcory", "adjamé", "anyama", "bingerville"}:
            return f"Abidjan - {city.capitalize()}"
        return city
    return "Abidjan"
