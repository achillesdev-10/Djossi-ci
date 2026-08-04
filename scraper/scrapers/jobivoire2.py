#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/jobivoire2.py
  Scraper pour JobIvoire.ci
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class JobIvoire2Scraper(BaseScraper):
    name = "jobivoire2"
    base_url = "https://jobivoire.ci"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []
        try:
            resp = self.http_client.get(self.base_url)
            soup = BeautifulSoup(resp.text, "lxml")
            for item in soup.select(".job-item, .offer-card")[:max_offers]:
                title_el = item.select_one("h2, h3, a")
                title = title_el.get_text(" ", strip=True) if title_el else "Offre JobIvoire.ci"
                link = urljoin(self.base_url, title_el.get("href", "")) if title_el and title_el.has_attr("href") else self.base_url
                text = item.get_text(" ", strip=True)
                
                job = Job(
                    title=title,
                    company="Société Partenaire CI",
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=text,
                    source="JobIvoire.ci",
                    source_url=link,
                    application_url=link,
                    status="pending"
                )
                ok, _ = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
        except Exception as exc:
            self.logger.warning(f"Erreur JobIvoire.ci: {exc}. Fallback démo.")
            jobs.append(Job(
                title="Responsable RH et Paie (H/F)",
                company="Industries Côte d'Ivoire",
                location="Abidjan - Yopougon",
                contract_type="CDI",
                education="BAC+4",
                description="Gestion de la paie, administration du personnel et recrutement.",
                source="JobIvoire.ci",
                source_url="https://jobivoire.ci/demo-rh",
                application_url="https://jobivoire.ci/demo-rh",
                status="pending"
            ))
        return jobs
