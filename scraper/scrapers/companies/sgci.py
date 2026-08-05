#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/companies/sgci.py
  Scraper pour Société Générale Côte d'Ivoire (www.societegenerale.ci)

  ⚠️ DÉSACTIVÉ : le site societegenerale.ci n'expose aucune page carrières
  publique exploitable en HTTP statique (les offres passent par des portails
  externes dynamiques). Ce scraper n'est plus enregistré dans le registre
  principal (scraper/scraper.py).
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
        self.logger.warning(
            "SGCI : pas de page carrières publique exploitable — scraper désactivé, aucune donnée générée."
        )
        return []
