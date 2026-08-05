#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/orange.py
  Scraper pour Orange Côte d'Ivoire (orange.jobs)

  Note : les offres Orange CI sont publiées sur la plateforme Phenom People
  (orange.jobs), rendue entièrement en JavaScript — le HTML statique ne
  contient aucun poste. On tente un parsing best-effort des pages de
  résultats ; à défaut, retour vide honnête (pas de fausses offres).
===============================================================================
"""

from __future__ import annotations

from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class OrangeScraper(BaseScraper):
    name = "orange"
    base_url = "https://orange.jobs"

    # Textes de navigation jamais considérés comme des titres d'offre.
    _NAV_WORDS = ("voir les postes", "voir les offres", "nos activités", "nos activites",
                  "accueil", "connexion", "à propos", "a propos", "politique", "contact")

    ci_urls = [
        "https://orange.jobs/fr/fr/cote-d-ivoire-results",
        "https://orange.jobs/fr/fr/cote-d-ivoire-with-it",
        "https://orange.jobs/fr/fr/cote-d-ivoire-with-sales",
        "https://orange.jobs/fr/fr/cote-d-ivoire-internship",
    ]

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.ci_urls[0]}")
        jobs: List[Job] = []

        for url in self.ci_urls:
            if len(jobs) >= max_offers:
                break
            soup = self.get_soup(url)
            if soup is None:
                continue
            for a in soup.select('a[href*="posting"], a[href*="/job/"], a[href*="requisition"], a[href*="career"]'):
                try:
                    title = a.get_text(" ", strip=True)
                    href = a.get("href", "")
                    low = title.lower()
                    if (
                        len(title) < 10
                        or not href
                        or href.startswith(("#", "javascript:"))
                        or href in self.ci_urls
                        or any(w in low for w in self._NAV_WORDS)
                    ):
                        continue
                    link = urljoin(self.base_url, href)
                    job = Job(
                        title=title,
                        company="Orange Côte d'Ivoire",
                        location=self.guess_location(f"{title} Abidjan"),
                        contract_type=self.guess_contract(title),
                        education=self.guess_education(title),
                        description=title,
                        source="Orange CI",
                        source_url=link,
                        application_url=link,
                        status="pending",
                    )
                    ok, _ = job.is_valid_ivorian()
                    if ok:
                        jobs.append(job)
                except Exception as exc:
                    self.logger.debug(f"Erreur sur un lien Orange : {exc}")

        if not jobs:
            self.logger.warning(
                "Orange CI : plateforme carrières (Phenom People) rendue en JavaScript — "
                "aucun poste récupérable via HTTP statique. Aucune donnée factice générée."
            )
        return jobs
