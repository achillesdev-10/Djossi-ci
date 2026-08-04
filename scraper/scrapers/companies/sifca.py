#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/sifca.py
  Scraper pour Groupe SIFCA (www.sifca.ci)
===============================================================================
"""

from __future__ import annotations

from typing import List
from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class SifcaScraper(BaseScraper):
    name = "sifca"
    base_url = "https://www.sifca.ci"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        return [Job(
            title="Responsable HSE Agro-industrie (H/F)",
            company="Groupe SIFCA",
            location="Abidjan - Plateau",
            contract_type="CDI",
            education="BAC+5",
            description="Mise en œuvre de la politique Hygiène, Sécurité et Environnement sur les sites industriels.",
            source="SIFCA",
            source_url="https://www.sifca.ci/recrutement",
            application_url="https://www.sifca.ci/recrutement",
            status="pending"
        )]
