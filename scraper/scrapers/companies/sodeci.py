#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/sodeci.py
  Scraper pour SODECI (www.sodeci.ci/recrutement)

  ⚠️ DÉSACTIVÉ : la page recrutement de la SODECI ne présente aucune annonce
  exploitable en HTML statique (aucune offre listée, recrutements diffusés
  par ailleurs). Ce scraper n'est plus enregistré dans le registre principal
  (scraper/scraper.py).
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
        self.logger.warning(
            "SODECI : aucune annonce listée sur la page recrutement — scraper désactivé, aucune donnée générée."
        )
        return []
