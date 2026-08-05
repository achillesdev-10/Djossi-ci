#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/cie.py
  Scraper pour CIE (Compagnie Ivoirienne d'Électricité)

  Les offres CIE sont publiées sur le portail externe Socium Job
  (sociumjob.com/carriere/cie). Parsing best-effort ; retour vide honnête
  si la page est dynamique ou injoignable (pas de fausses offres).
===============================================================================
"""

from __future__ import annotations

from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job

_NAV_WORDS = ("accueil", "connexion", "inscription", "contact", "à propos", "a propos",
              "mentions", "politique", "se connecter", "retour", "rechercher")


class CieScraper(BaseScraper):
    name = "cie"
    base_url = "https://sociumjob.com"
    listing_url = "https://sociumjob.com/carriere/cie"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.listing_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.listing_url)
        if soup is None:
            self.logger.warning("Portail CIE (Socium Job) injoignable. Aucune offre récupérée.")
            return jobs

        candidates: List[tuple[str, str]] = []
        for sel in (".job-item", ".job-offer", ".offre", ".offer-card", "article", ".card"):
            for item in soup.select(sel):
                h = item.select_one("h1, h2, h3, h4")
                a = item.select_one('a[href]')
                if h and a:
                    candidates.append((h.get_text(" ", strip=True), a.get("href", "")))

        if not candidates:
            for a in soup.select('a[href*="offre"], a[href*="job"], a[href*="poste"], a[href*="annonce"]'):
                title = a.get_text(" ", strip=True)
                href = a.get("href", "")
                if len(title) >= 15 and not any(w in title.lower() for w in _NAV_WORDS):
                    candidates.append((title, href))

        for title, href in candidates[:max_offers]:
            try:
                if len(title) < 5 or not href or href.startswith(("#", "javascript:")):
                    continue
                link = urljoin(self.base_url, href)
                job = Job(
                    title=title,
                    company="CIE Côte d'Ivoire",
                    location=self.guess_location(f"{title} Abidjan"),
                    contract_type=self.guess_contract(title),
                    education=self.guess_education(title),
                    description=title,
                    source="CIE CI",
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
                self.logger.debug(f"Erreur sur une offre CIE : {exc}")

        if not jobs:
            self.logger.warning(
                "CIE : aucune offre détectée sur le portail Socium Job. Aucune donnée factice générée."
            )
        return jobs
