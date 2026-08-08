#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/models/exam_item.py
  Modèle DÉDIÉ aux concours administratifs (table `exams`)

  Contrairement au dépôt unifié `job_offers`, les concours disposent d'une
  table riche (éligibilité, dates clés, documents, confiance IA). Ce modèle
  reflète 1:1 la migration Supabase 0010_create_exams_table.sql.
===============================================================================
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Constantes (miroir de src/lib/examConstants.ts)
# -----------------------------------------------------------------------------
EXAM_CATEGORIES = (
    "administratif",
    "sante",
    "enseignement",
    "securite",
    "militaire",
    "autre",
)

EXAM_TYPES = (
    "recrutement_nouveau",
    "promotion",
    "concours_direct",
    "concours_professionnel",
    "entree_ecole",
    "examen",
)

EXAM_CONFIDENCE = ("low", "medium", "high")

# Échelle des diplômes ivoiriens (niveau croissant) — filtrage front.
DIPLOMA_LEVELS = {
    "CEPE": 1,
    "BEPC": 2,
    "CAP/BEP": 3,
    "CAP": 3,
    "BEP": 3,
    "BAC": 4,
    "BTS/DUT": 5,
    "BTS": 5,
    "DUT": 5,
    "DEUG": 5,
    "LICENCE": 6,
    "LICENCE PRO": 6,
    "MASTER": 7,
    "INGENIEUR": 7,
    "DOCTORAT": 8,
}


def diploma_level(diploma: Optional[str]) -> Optional[int]:
    """Niveau minimal d'un diplôme donné (normalisé), ou None si inconnu."""
    if not diploma:
        return None
    key = diploma.strip().upper()
    if key in DIPLOMA_LEVELS:
        return DIPLOMA_LEVELS[key]
    for k, level in DIPLOMA_LEVELS.items():
        base = k.split("/")[0]
        if key.startswith(base) or base.startswith(key):
            return level
    return None


def compute_min_diploma_level(diplomas: List[str]) -> Optional[int]:
    levels = [diploma_level(d) for d in diplomas]
    levels = [lvl for lvl in levels if lvl is not None]
    return min(levels) if levels else None


# -----------------------------------------------------------------------------
# Normalisation des diplômes → valeurs canoniques du filtre front (DIPLOMA_FILTERS)
# -----------------------------------------------------------------------------
# Le filtre /concours?diploma=… fait une égalité EXACTE sur le tableau `diplomas`
# (json_each côté SQLite, `contains` côté Supabase). Les variantes rencontrées
# dans les communiqués (baccalauréat, BAC+3, BTS, DUT, Licence Pro, Maîtrise…)
# doivent donc être ramenées à la valeur canonique du filtre.
_DIPLOMA_ALIASES = {
    "CEPE": "CEPE",
    "BEPC": "BEPC",
    "CAP": "CAP/BEP",
    "CAP/BEP": "CAP/BEP",
    "BEP": "CAP/BEP",
    "BAC": "BAC",
    "BTS": "BTS/DUT",
    "BTS/DUT": "BTS/DUT",
    "DUT": "BTS/DUT",
    "DEUG": "DEUG",
    "LICENCE": "LICENCE",
    "LICENCE PRO": "LICENCE",
    "LICENCE PROFESSIONNELLE": "LICENCE",
    "MASTER": "MASTER",
    "INGENIEUR": "INGENIEUR",
    "DOCTORAT": "DOCTORAT",
}

# Variantes libres (baccalauréat, BAC+3, Maîtrise, PHD, CAP1/CAP2…) détectées par regex.
_DIPLOMA_VARIANTS = [
    (re.compile(r"^BACCALAUREAT$|^BACCALAURÉAT$", re.I), "BAC"),
    (re.compile(r"^BACC?\s*\+\s*\d+$", re.I), "BAC"),
    (re.compile(r"^MAITRISE$|^MAÎTRISE$", re.I), "MASTER"),
    (re.compile(r"^PHD$|^PH\.?D$", re.I), "DOCTORAT"),
    (re.compile(r"^CAP\s*[12]$", re.I), "CAP/BEP"),
    (re.compile(r"^INGÉNIEUR$", re.I), "INGENIEUR"),
]


def normalize_diploma(raw: Optional[str]) -> Optional[str]:
    """Ramène un diplôme brut à sa valeur canonique (filtre front), None si vide."""
    if not raw:
        return None
    token = re.sub(r"\s+", " ", str(raw).strip().upper().replace("’", "'"))
    if not token:
        return None
    if token in _DIPLOMA_ALIASES:
        return _DIPLOMA_ALIASES[token]
    for pat, canonical in _DIPLOMA_VARIANTS:
        if pat.match(token):
            return canonical
    return token


def normalize_diplomas(diplomas: List[str]) -> List[str]:
    """Normalise + déduplique (ordre préservé) une liste de diplômes."""
    out: List[str] = []
    for d in diplomas:
        n = normalize_diploma(d)
        if n and n not in out:
            out.append(n)
    return out


# -----------------------------------------------------------------------------
# Normalisation / validation des URLs sources
# -----------------------------------------------------------------------------
# Paramètres de suivi à retirer : deux URLs ne différant que par un ?utm_…
# désignent la même fiche et doivent être dédupliquées.
_TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "ref", "ref_source", "source",
}


def normalize_source_url(url: Optional[str]) -> Optional[str]:
    """URL source normalisée : minuscules, sans fragment ni paramètres de suivi."""
    if not url:
        return None
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return url.strip()
    if parts.scheme.lower() not in ("http", "https") or not parts.hostname:
        return url.strip()
    query = parts.query
    kept = [
        (k, v) for k, v in parse_qsl(query, keep_blank_values=True)
        if k.lower() not in _TRACKING_PARAMS
    ]

    return urlunsplit(
        (
            parts.scheme.lower(),
            parts.netloc.lower(),
            parts.path or "/",
            urlencode(kept) if kept else "",
            "",  # fragment toujours supprimé
        )
    )


def url_hostname(url: Optional[str]) -> Optional[str]:
    """Hôte (minuscules, sans port) d'une URL, None si invalide."""
    if not url:
        return None
    try:
        host = urlsplit(url).hostname
    except ValueError:
        return None
    return host.lower() if host else None


def validate_source_url(url: Optional[str]) -> tuple[bool, str]:
    """Validation stricte d'une URL source : schéma http(s) + hôte valide."""
    if not url:
        return False, "source_url obligatoire"
    try:
        parts = urlsplit(url)
    except ValueError:
        return False, "source_url invalide (non parsable)"
    if parts.scheme.lower() not in ("http", "https"):
        return False, f"source_url invalide (schéma « {parts.scheme or 'vide'} »)"
    if not parts.hostname or "." not in parts.hostname:
        return False, "source_url invalide (hôte absent)"
    return True, "ok"


def is_url_on_domain(url: Optional[str], allowed_domains: List[str]) -> bool:
    """True si l'hôte de `url` appartient à l'un des domaines autorisés (ou sous-domaine)."""
    host = url_hostname(url)
    if not host:
        return False
    for domain in allowed_domains:
        d = domain.strip().lower().lstrip(".")
        if not d:
            continue
        if host == d or host.endswith("." + d):
            return True
    return False


class ExamItem(BaseModel):
    """Un concours extrait d'une source officielle, avant validation BDD."""

    title: str = Field(..., min_length=3)
    organizer: str = Field(..., min_length=2)
    category: str = "administratif"
    exam_type: Optional[str] = None
    description_md: str = Field(..., min_length=10)
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    exam_date: Optional[datetime] = None
    results_date: Optional[datetime] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    age_reference_date: Optional[str] = None
    nationality: Optional[str] = None
    diplomas: List[str] = []
    min_diploma_level: Optional[int] = None
    positions_count: Optional[int] = None
    registration_fee: Optional[str] = None
    location: Optional[str] = None
    cities: List[str] = []
    documents: List[dict] = []  # [{name, url}]
    source: str = "web"
    source_url: str
    status: str = "pending"
    confidence: str = "medium"
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    slug: Optional[str] = None
    scraped_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    def __init__(self, **data):
        super().__init__(**data)
        # Normalisation après construction.
        self.category = self.category if self.category in EXAM_CATEGORIES else "administratif"
        if self.exam_type and self.exam_type not in EXAM_TYPES:
            self.exam_type = None
        self.confidence = self.confidence if self.confidence in EXAM_CONFIDENCE else "medium"
        # Diplômes normalisés vers les valeurs canoniques du filtre front.
        self.diplomas = normalize_diplomas(self.diplomas)
        self.min_diploma_level = compute_min_diploma_level(self.diplomas)
        # URL source normalisée (minuscules, sans fragment ni paramètres de suivi)
        # → la déduplication par source_url devient robuste.
        self.source_url = normalize_source_url(self.source_url) or ""

    # ------------------------------------------------------------------
    def dedup_key(self) -> str:
        from slugify import slugify

        return "|".join(
            [
                slugify(self.title, separator="-"),
                slugify(self.organizer or "inconnu", separator="-"),
            ]
        )

    def is_valid(self) -> tuple[bool, str]:
        if not self.title or len(self.title.strip()) < 3:
            return False, "titre trop court"
        if not self.organizer or len(self.organizer.strip()) < 2:
            return False, "organisateur absent"
        if not self.description_md or len(self.description_md.strip()) < 25:
            return False, "description trop courte"
        ok, reason = validate_source_url(self.source_url)
        if not ok:
            return False, reason
        return True, "ok"
