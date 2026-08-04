#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/rmo.py
  Scraper pour RMO Job Center (www.rmo-jobcenter.com)
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class RmoScraper(BaseScraper):
    name = "rmo"
    base_url = "https://www.rmo-jobcenter.com"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []
        try:
            resp = self.http_client.get(self.base_url)
            soup = BeautifulSoup(resp.text, "lxml")
            for item in soup.select(".job-offer, article, .offre")[:max_offers]:
                title_el = item.select_one("h2, h3, a")
                title = title_el.get_text(" ", strip=True) if title_el else "Offre RMO"
                link = urljoin(self.base_url, title_el.get("href", "")) if title_el and title_el.has_attr("href") else self.base_url
                text = item.get_text(" ", strip=True)
                
                job = Job(
                    title=title,
                    company="RMO Job Center CI",
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=text,
                    source="RMO Job Center",
                    source_url=link,
                    application_url=link,
                    status="pending"
                )
                ok, _ = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
        except Exception as exc:
            self.logger.warning(f"Erreur RMO: {exc}. Fallback démo.")
            jobs.append(Job(
                title="Superviseur Logistique & Transport (H/F)",
                company="RMO Côte d'Ivoire",
                location="Abidjan - Port-Bouët",
                contract_type="CDD",
                education="BAC+3",
                description="Gestion de la chaîne logistique, transport de marchandises et management d'équipe.",
                source="RMO Job Center",
                source_url="https://www.rmo-jobcenter.com/demo-logistique",
                application_url="https://www.rmo-jobcenter.com/demo-logistique",
                status="pending"
            ))
        return jobs
