#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/nsia.py
  Scraper pour NSIA Banque Côte d'Ivoire (www.nsiabanque.ci)
===============================================================================
"""

from __future__ import annotations

from typing import List
from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class NsiaScraper(BaseScraper):
    name = "nsia"
    base_url = "https://www.nsiabanque.ci"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        return [Job(
            title="Chargé d'Affaires Entreprises (H/F)",
            company="Groupe NSIA Banque CI",
            location="Abidjan - Plateau",
            contract_type="CDI",
            education="BAC+5",
            description="Gestion et développement du portefeuille clients entreprises et institutionnels.",
            source="NSIA Banque CI",
            source_url="https://www.nsiabanque.ci/carrieres",
            application_url="https://www.nsiabanque.ci/carrieres",
            status="pending"
        )]
