#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/companies/sifca.py
  Scraper pour Groupe SIFCA (groupesifca.com)

  Structure vérifiée (2026-08) : www.sifca.ci/recrutement redirige vers
  groupesifca.com/recrutement/ qui liste les postes :
    « 30 juillet 2026 » + « Ingénieur.e SAP AGRO – SIFCA »
    → https://groupesifca.com/recrutement/{slug}/
===============================================================================
"""

from __future__ import annotations

import re
from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job

_MONTHS = r"(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)"
_DATE_RE = re.compile(rf"^\d{{1,2}}\s+{_MONTHS}\s+\d{{4}}$", re.I)
_OFFER_PATH_RE = re.compile(r"/recrutement/[a-z0-9\-]+/?$", re.I)


class SifcaScraper(BaseScraper):
    name = "sifca"
    base_url = "https://groupesifca.com"
    listing_url = "https://groupesifca.com/recrutement/"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.listing_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.listing_url)
        if soup is None:
            return jobs

        seen: set[str] = set()
        for a in soup.select("a[href*='/recrutement/']"):
            try:
                href = a.get("href", "")
                if not _OFFER_PATH_RE.search(href):
                    continue
                # Filtre AVANT la dédup : pour une même URL, l'ancre « date »
                # précède souvent l'ancre « titre » dans le DOM.
                title = a.get_text(" ", strip=True)
                if len(title) < 5 or _DATE_RE.match(title):
                    continue
                full = urljoin(self.base_url, href)
                if full in seen:
                    continue
                seen.add(full)

                description = title
                dsoup = self.get_soup(full)
                if dsoup is not None:
                    main = dsoup.select_one("main") or dsoup.select_one("article") or dsoup.select_one(".entry-content")
                    if main:
                        description = main.get_text(" ", strip=True)
                    h1 = dsoup.find("h1")
                    if h1:
                        title = h1.get_text(" ", strip=True) or title

                job = Job(
                    title=title,
                    company="Groupe SIFCA",
                    location=self.guess_location(f"{description} Côte d'Ivoire"),
                    contract_type=self.guess_contract(description),
                    education=self.guess_education(description),
                    description=description,
                    source="Groupe SIFCA",
                    source_url=full,
                    application_url=full,
                    status="pending",
                )
                ok, reason = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
                else:
                    self.logger.debug(f"  🚫 Rejeté ({reason}) : {title}")
                if len(jobs) >= max_offers:
                    break
            except Exception as exc:
                self.logger.debug(f"Erreur sur une offre SIFCA : {exc}")

        return jobs
