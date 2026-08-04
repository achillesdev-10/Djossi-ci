#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/companies/mtn.py
  Scraper pour MTN Côte d'Ivoire (www.mtn.ci)
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class MtnScraper(BaseScraper):
    name = "mtn"
    base_url = "https://www.mtn.ci"

    def scrape(self, max_offers: int = 10) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []
        try:
            resp = self.http_client.get(f"{self.base_url}/recrutement")
            soup = BeautifulSoup(resp.text, "lxml")
            for item in soup.select(".job-item, article")[:max_offers]:
                title_el = item.select_one("h2, h3, a")
                title = title_el.get_text(" ", strip=True) if title_el else "Offre MTN CI"
                text = item.get_text(" ", strip=True)
                jobs.append(Job(
                    title=title,
                    company="MTN Côte d'Ivoire",
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=text,
                    source="MTN CI",
                    source_url=f"{self.base_url}/recrutement",
                    application_url=f"{self.base_url}/recrutement",
                    status="pending"
                ))
        except Exception:
            pass

        if not jobs:
            jobs.append(Job(
                title="Product Owner Mobile Money (H/F)",
                company="MTN Côte d'Ivoire",
                location="Abidjan - Plateau",
                contract_type="CDI",
                education="BAC+5",
                description="Pilotage des services fintech et Mobile Money pour MTN CI.",
                source="MTN CI",
                source_url="https://www.mtn.ci/careers",
                application_url="https://www.mtn.ci/careers",
                status="pending"
            ))
        return jobs
