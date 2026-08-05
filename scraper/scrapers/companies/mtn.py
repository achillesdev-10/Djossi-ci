#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/companies/mtn.py
  Scraper pour MTN Côte d'Ivoire (www.mtn.ci/careers/)

  Note : l'archive carrières de mtn.ci est rendue en JavaScript — aucune
  annonce n'est présente dans le HTML statique. On tente un parsing
  best-effort ; à défaut, retour vide honnête (pas de fausses offres).
===============================================================================
"""

from __future__ import annotations

from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class MtnScraper(BaseScraper):
    name = "mtn"
    base_url = "https://www.mtn.ci"
    listing_url = "https://www.mtn.ci/careers/"

    # Textes de navigation jamais considérés comme des titres d'offre.
    _NAV_WORDS = ("voir les offres", "voir toutes les offres", "carriere", "carrières",
                  "accueil", "connexion", "à propos", "a propos", "politique", "contact")

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.listing_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.listing_url)
        if soup is None:
            self.logger.warning("MTN CI injoignable. Aucune offre récupérée.")
            return jobs

        for a in soup.select('a[href*="career"], a[href*="job"], a[href*="offre"], a[href*="poste"]'):
            try:
                title = a.get_text(" ", strip=True)
                href = a.get("href", "")
                low = title.lower()
                if (
                    len(title) < 10
                    or not href
                    or href.startswith(("#", "javascript:"))
                    or href.rstrip("/") == self.listing_url.rstrip("/")
                    or any(w in low for w in self._NAV_WORDS)
                ):
                    continue
                link = urljoin(self.base_url, href)
                job = Job(
                    title=title,
                    company="MTN Côte d'Ivoire",
                    location=self.guess_location(f"{title} Abidjan"),
                    contract_type=self.guess_contract(title),
                    education=self.guess_education(title),
                    description=title,
                    source="MTN CI",
                    source_url=link,
                    application_url=link,
                    status="pending",
                )
                ok, _ = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
                if len(jobs) >= max_offers:
                    break
            except Exception as exc:
                self.logger.debug(f"Erreur sur un lien MTN : {exc}")

        if not jobs:
            self.logger.warning(
                "MTN CI : archive carrières rendue en JavaScript — aucun poste récupérable "
                "via HTTP statique. Aucune donnée factice générée."
            )
        return jobs
