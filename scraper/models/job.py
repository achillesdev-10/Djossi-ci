#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/models/job.py
  Modèle Pydantic complet pour les offres d'emploi (standard Côte d'Ivoire)
===============================================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl
from slugify import slugify


class Job(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=2)
    company: str = Field(..., min_length=2)
    company_logo: Optional[str] = None
    location: str = "Abidjan"
    salary: Optional[str] = None
    currency: str = "XOF"
    contract_type: str = "CDI"  # CDI, CDD, Stage, Prestation, Alternance, Freelance
    experience: Optional[str] = None
    education: Optional[str] = None  # BAC+2, BAC+3, BAC+5, Master, Licence, Doctorat
    category: Optional[str] = None
    description: str
    requirements: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    published_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    application_url: Optional[str] = None
    application_email: Optional[str] = None
    source: str = "web"
    source_url: str
    country: str = "Côte d'Ivoire"
    city: str = "Abidjan"
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_remote: bool = False
    is_active: bool = True
    is_verified: bool = False
    status: str = "pending"  # pending, published, rejected, archived
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    slug: Optional[str] = None
    scraped_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    def dedup_key(self) -> str:
        parts = [
            slugify(self.title, separator="-"),
            slugify(self.company or "inconnue", separator="-"),
            slugify(self.city or self.location or "abidjan", separator="-"),
        ]
        return "|".join(p for p in parts if p)

    def is_valid_ivorian(self) -> tuple[bool, str]:
        if not self.title or len(self.title.strip()) < 3:
            return False, "titre trop court"
        if not self.company or len(self.company.strip()) < 2:
            return False, "entreprise absente"
        if not self.description or len(self.description.strip()) < 25:
            return False, "description trop courte"
        if not self.source_url:
            return False, "source_url obligatoire"

        ivorian_keywords = [
            "côte d'ivoire", "cote d'ivoire", "ivory coast", "abidjan", "yamoussoukro",
            "bouaké", "san-pedro", "san pedro", "daloa", "korhogo", "man", "gagnoa",
            "abobo", "cocody", "plateau", "treichville", "port-bouët", "port bouet",
            "koumassi", "adjamé", "yopougon", "marcory", "anyama", "bingerville", ".ci"
        ]
        corpus = f"{self.title} {self.location} {self.description} {self.source_url}".lower()
        if not any(kw in corpus for kw in ivorian_keywords):
            return False, "hors ciblage géographique ivoirien"

        return True, "ok"
