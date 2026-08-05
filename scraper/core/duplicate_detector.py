#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/core/duplicate_detector.py
  Détection avancée des doublons (titre, entreprise, ville, hash, similarité)
===============================================================================
"""

from __future__ import annotations

import hashlib
from typing import Set
from scraper.models.job import Job


class DuplicateDetector:
    def __init__(self):
        self.seen_hashes: Set[str] = set()
        self.seen_keys: Set[str] = set()

    def compute_hash(self, job: Job) -> str:
        corpus = f"{job.title.lower().strip()}|{job.company.lower().strip()}|{job.city.lower().strip()}"
        return hashlib.sha256(corpus.encode("utf-8")).hexdigest()

    def is_duplicate(self, job: Job) -> bool:
        h = self.compute_hash(job)
        k = job.dedup_key()
        if h in self.seen_hashes or k in self.seen_keys:
            return True
        self.seen_hashes.add(h)
        self.seen_keys.add(k)
        return False
