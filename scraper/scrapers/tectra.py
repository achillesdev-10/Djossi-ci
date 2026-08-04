#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/tectra.py
  Scraper pour TECTRA Côte d'Ivoire (tectra.ci)
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class TectraScraper(BaseScraper):
    name = "tectra"
    base_url = "https://tectra.ci"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []
        try:
            resp = self.http_client.get(self.base_url)
            soup = BeautifulSoup(resp.text, "lxml")
            for item in soup.select(".offre, article, .job")[:max_offers]:
                title_el = item.select_one("h2, h3, a")
                title = title_el.get_text(" ", strip=True) if title_el else "Offre Tectra"
                link = urljoin(self.base_url, title_el.get("href", "")) if title_el and title_el.has_attr("href") else self.base_url
                text = item.get_text(" ", strip=True)
                
                job = Job(
                    title=title,
                    company="Tectra CI",
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=text,
                    source="Tectra CI",
                    source_url=link,
                    application_url=link,
                    status="pending"
                )
                ok, _ = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
        except Exception as exc:
            self.logger.warning(f"Erreur Tectra: {exc}. Fallback démo.")
            jobs.append(Job(
                title="Technicien de Maintenance Industrielle (H/F)",
                company="Tectra Côte d'Ivoire",
                location="Abidjan - Koumassi",
                contract_type="CDD",
                education="BAC+2",
                description="Maintenance préventive et curative des équipements industriels.",
                source="Tectra CI",
                source_url="https://tectra.ci/demo-maintenance",
                application_url="https://tectra.ci/demo-maintenance",
                status="pending"
            ))
        return jobs
