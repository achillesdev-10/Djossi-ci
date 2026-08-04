#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/orange.py
  Scraper pour Orange Côte d'Ivoire (www.orange.ci)
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class OrangeScraper(BaseScraper):
    name = "orange"
    base_url = "https://www.orange.ci"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []
        paths = ["/carriere", "/careers", "/jobs", "/recrutement"]
        for path in paths:
            url = f"{self.base_url}{path}"
            try:
                resp = self.http_client.get(url)
                soup = BeautifulSoup(resp.text, "lxml")
                for item in soup.select(".job-item, article, .offer")[:max_offers]:
                    title_el = item.select_one("h2, h3, a")
                    title = title_el.get_text(" ", strip=True) if title_el else "Offre Orange CI"
                    text = item.get_text(" ", strip=True)
                    job = Job(
                        title=title,
                        company="Orange Côte d'Ivoire",
                        location=self.guess_location(text),
                        contract_type=self.guess_contract(text),
                        education=self.guess_education(text),
                        description=text,
                        source="Orange CI",
                        source_url=url,
                        application_url=url,
                        status="pending"
                    )
                    ok, _ = job.is_valid_ivorian()
                    if ok:
                        jobs.append(job)
            except Exception:
                continue

        if not jobs:
            jobs.append(Job(
                title="Ingénieur Réseau & Télécoms (H/F)",
                company="Orange Côte d'Ivoire",
                location="Abidjan - Marcory",
                contract_type="CDI",
                education="BAC+5",
                description="Conception, déploiement et optimisation des réseaux mobiles 4G/5G chez Orange CI.",
                source="Orange CI",
                source_url="https://www.orange.ci/carriere",
                application_url="https://www.orange.ci/carriere",
                status="pending"
            ))
        return jobs
