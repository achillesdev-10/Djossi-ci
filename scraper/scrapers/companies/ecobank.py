#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/companies/ecobank.py
  Scraper pour Ecobank (www.ecobank.com/careers)

  ⚠️ DÉSACTIVÉ : le portail carrières Ecobank est entièrement dynamique (JS) —
  aucun contenu statique exploitable via HTTP simple. Ce scraper n'est plus
  enregistré dans le registre principal (scraper/scraper.py). Si le portail
  évolue vers du HTML statique, le scraping peut être réactivé ici.
===============================================================================
"""

from __future__ import annotations

from typing import List

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class EcobankScraper(BaseScraper):
    name = "ecobank"
    base_url = "https://www.ecobank.com"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.warning(
            "Ecobank : portail carrières dynamique (JS) — scraper désactivé, aucune donnée générée."
        )
        return []
