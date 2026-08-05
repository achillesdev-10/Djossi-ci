#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/novojob.py
  Scraper pour Novojob Côte d'Ivoire (www.novojob.com/cote-d-ivoire)

  Note : l'ancienne cible « ci.novojob.com » était un site de démonstration
  factice (« This is Compose/Flask demo »). Le vrai portail Novojob CI se
  trouve sur www.novojob.com/cote-d-ivoire/offres-d-emploi.

  Structure vérifiée (2026-08) :
    - Listing : /cote-d-ivoire/offres-d-emploi → cartes `.job-details`
      « Titre — ENTREPRISE — Ville, Côte d'ivoire — date — expérience »
    - Lien annonce : .../offre-d-emploi/cote-d-ivoire/{ville}/{id}-{slug}
===============================================================================
"""

from __future__ import annotations

from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.core.utils import guess_company_from_card
from scraper.models.job import Job


class NovojobScraper(BaseScraper):
    name = "novojob"
    base_url = "https://www.novojob.com"
    listing_url = "https://www.novojob.com/cote-d-ivoire/offres-d-emploi"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.listing_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.listing_url)
        if soup is None:
            return jobs

        cards = soup.select(".job-details")[:max_offers]
        for card in cards:
            try:
                a = card.select_one('a[href*="offre-d-emploi"]')
                if not a:
                    continue
                title = a.get_text(" ", strip=True)
                link = urljoin(self.base_url, a.get("href", ""))
                text = card.get_text(" ", strip=True)
                company = guess_company_from_card(text, title, default="Novojob.com")

                job = Job(
                    title=title,
                    company=company,
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=text,
                    source="Novojob.com",
                    source_url=link,
                    application_url=link,
                    status="pending",
                )
                ok, reason = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
                else:
                    self.logger.debug(f"  🚫 Rejeté ({reason}) : {title}")
            except Exception as exc:
                self.logger.debug(f"Erreur sur une carte Novojob : {exc}")

        return jobs
