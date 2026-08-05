#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/emploi_ci.py
  Scraper pour Emploi.ci

  Note : www.emploi.ci est protégé par Cloudflare (« Just a moment… ») — les
  requêtes HTTP simples obtiennent un 403. Ce scraper tente un parsing
  statique et, en cas de blocage, ne retourne AUCUNE donnée factice : il le
  signale dans les logs et s'arrête proprement.
===============================================================================
"""

from __future__ import annotations

import re
from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class EmploiCiScraper(BaseScraper):
    name = "emploici"
    base_url = "https://www.emploi.ci"
    listing_url = "https://www.emploi.ci/recherche-jobs-cote-ivoire"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.listing_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.listing_url)
        if soup is None:
            self.logger.warning("Emploi.ci inaccessible (probable blocage Cloudflare). Aucune offre récupérée.")
            return jobs

        links: set[str] = set()
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            full = urljoin(self.base_url, href)
            if re.search(r"/offre", full.lower(), re.I) and full.startswith(self.base_url):
                links.add(full)

        for link in list(links)[:max_offers]:
            try:
                dsoup = self.get_soup(link)
                if dsoup is None:
                    continue
                h1 = dsoup.find("h1")
                title = h1.get_text(" ", strip=True) if h1 else "Offre Emploi.ci"
                content = dsoup.select_one(".job-details") or dsoup.select_one("article") or dsoup.select_one("main") or dsoup
                text = dsoup.get_text(" ", strip=True)

                job = Job(
                    title=title,
                    company=self.guess_company(text, default="Emploi.ci"),
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=self.clean_html(str(content)),
                    source="Emploi.ci",
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
                self.logger.debug(f"Erreur lien {link}: {exc}")

        return jobs
