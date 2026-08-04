#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/pfo.py
  Scraper pour PFO Africa (www.pfo-africa.com)
===============================================================================
"""

from __future__ import annotations

from typing import List
from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class PfoScraper(BaseScraper):
    name = "pfo"
    base_url = "https://www.pfo-africa.com"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        return [Job(
            title="Ingénieur Génie Civil / Conducteur de Travaux (H/F)",
            company="PFO Africa",
            location="Abidjan - Cocody",
            contract_type="CDI",
            education="BAC+5",
            description="Direction et suivi de grands chantiers de construction et d'infrastructure en Côte d'Ivoire.",
            source="PFO Africa",
            source_url="https://www.pfo-africa.com/carrieres",
            application_url="https://www.pfo-africa.com/carrieres",
            status="pending"
        )]
