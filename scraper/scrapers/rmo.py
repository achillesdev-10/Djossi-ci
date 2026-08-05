#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/rmo.py
  Scraper pour RMO Job Center (www.rmo-jobcenter.com)

  Structure vérifiée (2026-08) :
    - Listing Côte d'Ivoire : /fr/cote-d-ivoire/offres-emploi.html
      → lignes <tr> : date, titre (lien /offres-emploi/{categorie}/{id}-{slug}.html),
        secteur, réf, « expire le JJ/MM/AAAA »
    - Détail : page statique, description complète dans `.contenu`
    - Flux RSS CI disponible : /flux-rss/filiales/cote-d-ivoire/offres.xml
===============================================================================
"""

from __future__ import annotations

import re
from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job

# Lien d'annonce RMO : .../offres-emploi/{categorie}/{id}-{slug}.html
_OFFER_LINK_RE = re.compile(r"/offres-emploi/[^/]+/\d+-", re.I)


class RmoScraper(BaseScraper):
    name = "rmo"
    base_url = "https://www.rmo-jobcenter.com"
    listing_url = "https://www.rmo-jobcenter.com/fr/cote-d-ivoire/offres-emploi.html"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.listing_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.listing_url)
        if soup is None:
            return jobs

        rows = []
        for tr in soup.select("tr"):
            a = tr.select_one('a[href*="offres-emploi"]')
            if not a:
                continue
            href = a.get("href", "")
            if "cote-d-ivoire" not in href.lower() or not _OFFER_LINK_RE.search(href):
                continue
            rows.append(tr)

        for tr in rows[:max_offers]:
            try:
                a = tr.select_one('a[href*="offres-emploi"]')
                title = a.get_text(" ", strip=True)
                link = urljoin(self.base_url, a.get("href", ""))
                row_text = tr.get_text(" ", strip=True)
                description = row_text

                # Description enrichie via la page détail (.contenu).
                dsoup = self.get_soup(link)
                if dsoup is not None:
                    contenu = dsoup.select_one(".contenu")
                    if contenu:
                        description = contenu.get_text(" ", strip=True)

                job = Job(
                    title=title,
                    company="RMO Job Center",
                    location=self.guess_location(f"{row_text} Côte d'Ivoire"),
                    contract_type=self.guess_contract(description or row_text),
                    education=self.guess_education(description or row_text),
                    description=description or row_text,
                    deadline=self.extract_deadline(row_text),
                    source="RMO Job Center",
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
                self.logger.debug(f"Erreur sur une offre RMO : {exc}")

        return jobs
