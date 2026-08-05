#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/companies/pfo.py
  Scraper pour PFO Africa (www.pfo-africa.com)

  ⚠️ DÉSACTIVÉ : le site pfo-africa.com est injoignable et n'expose pas de
  page carrières publique exploitable. Ce scraper n'est plus enregistré dans
  le registre principal (scraper/scraper.py).
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
        self.logger.warning(
            "PFO Africa : site injoignable / pas de carrières exploitables — scraper désactivé, aucune donnée générée."
        )
        return []
