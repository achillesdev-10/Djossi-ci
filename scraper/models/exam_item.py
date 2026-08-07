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
        self.diplomas = [str(d).strip().upper() for d in self.diplomas if str(d).strip()]
        self.min_diploma_level = compute_min_diploma_level(self.diplomas)

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
        if not self.source_url:
            return False, "source_url obligatoire"
        return True, "ok"
