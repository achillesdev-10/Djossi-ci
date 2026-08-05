#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/educarriere.py
  Scraper pour Educarriere.ci (Emplois, Stages, Concours)

  Correction : l'ancien filtre (« emploi » dans l'URL) matchait TOUT le site
  puisque le domaine contient lui-même « emploi » (emploi.educarriere.ci) —
  des pages inutiles étaient scrapées. On ne garde que les vraies annonces :
  /offre-XXXX-….html, /stage-…, /concours-…
===============================================================================
"""

from __future__ import annotations

import re
from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job

_ANNOUNCE_RE = re.compile(r"/(offre|stage|concours)-", re.I)


class EducarriereScraper(BaseScraper):
    name = "educarriere"
    base_url = "https://emploi.educarriere.ci"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.base_url)
        if soup is None:
            return jobs

        links: set[str] = set()
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            full = urljoin(self.base_url, href)
            if _ANNOUNCE_RE.search(full.lower()) and full.startswith(self.base_url):
                links.add(full)

        for link in list(links)[:max_offers]:
            try:
                dsoup = self.get_soup(link)
                if dsoup is None:
                    continue
                h1 = dsoup.find("h1")
                title = h1.get_text(" ", strip=True) if h1 else "Offre d'emploi Côte d'Ivoire"
                content = (
                    dsoup.select_one(".job-description")
                    or dsoup.select_one("article")
                    or dsoup.select_one("main")
                    or dsoup.select_one(".content")
                    or dsoup
                )
                text = dsoup.get_text(" ", strip=True)

                job = Job(
                    title=title,
                    company=self.guess_company(text, default="Educarriere.ci"),
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=self.clean_html(str(content)),
                    deadline=self.extract_deadline(text),
                    source="Educarriere.ci",
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
                self.logger.debug(f"Erreur sur lien {link}: {exc}")

        return jobs
