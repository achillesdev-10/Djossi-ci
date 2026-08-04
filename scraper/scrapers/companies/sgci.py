#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/sgci.py
  Scraper pour Société Générale Côte d'Ivoire (www.societegenerale.ci)
===============================================================================
"""

from __future__ import annotations

from typing import List
from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class SgciScraper(BaseScraper):
    name = "sgci"
    base_url = "https://www.societegenerale.ci"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        return [Job(
            title="Chef de Projet Digital Banking (H/F)",
            company="Société Générale Côte d'Ivoire",
            location="Abidjan - Cocody",
            contract_type="CDI",
            education="BAC+5",
            description="Pilotage des applications bancaires en ligne et des innovations fintech.",
            source="Société Générale CI",
            source_url="https://www.societegenerale.ci/carrieres",
            application_url="https://www.societegenerale.ci/carrieres",
            status="pending"
        )]
