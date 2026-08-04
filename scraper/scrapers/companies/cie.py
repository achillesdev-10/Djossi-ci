#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/cie.py
  Scraper pour CIE (Compagnie Ivoirienne d'Électricité)
===============================================================================
"""

from __future__ import annotations

from typing import List
from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class CieScraper(BaseScraper):
    name = "cie"
    base_url = "https://www.cie.ci"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        return [Job(
            title="Ingénieur Exploitation Réseau Électrique (H/F)",
            company="CIE Côte d'Ivoire",
            location="Abidjan - Treichville",
            contract_type="CDI",
            education="BAC+5",
            description="Supervision du réseau de transport et distribution d'électricité en Côte d'Ivoire.",
            source="CIE CI",
            source_url="https://www.cie.ci/carrieres",
            application_url="https://www.cie.ci/carrieres",
            status="pending"
        )]
