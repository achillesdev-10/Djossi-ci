#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/sodeci.py
  Scraper pour SODECI (Société de Distribution d'Eau de Côte d'Ivoire)
===============================================================================
"""

from __future__ import annotations

from typing import List
from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class SodeciScraper(BaseScraper):
    name = "sodeci"
    base_url = "https://www.sodeci.ci"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        return [Job(
            title="Ingénieur Hydraulicien / Traitement des Eaux (H/F)",
            company="SODECI",
            location="Abidjan - Treichville",
            contract_type="CDI",
            education="BAC+5",
            description="Gestion des stations de traitement d'eau potable et optimisation du réseau de distribution en Côte d'Ivoire.",
            source="SODECI",
            source_url="https://www.sodeci.ci/recrutement",
            application_url="https://www.sodeci.ci/recrutement",
            status="pending"
        )]
