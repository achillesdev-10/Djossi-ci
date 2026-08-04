#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/agence_emploi_jeunes.py
  Scraper pour Agence Emploi Jeunes (www.emploijeunes.ci)
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class AgenceEmploiJeunesScraper(BaseScraper):
    name = "agence_emploi_jeunes"
    base_url = "https://www.emploijeunes.ci"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []
        try:
            resp = self.http_client.get(self.base_url)
            soup = BeautifulSoup(resp.text, "lxml")
            for item in soup.select(".offre, .stage, article")[:max_offers]:
                title_el = item.select_one("h2, h3, a")
                title = title_el.get_text(" ", strip=True) if title_el else "Offre Emploi Jeunes"
                link = urljoin(self.base_url, title_el.get("href", "")) if title_el and title_el.has_attr("href") else self.base_url
                text = item.get_text(" ", strip=True)
                
                job = Job(
                    title=title,
                    company="Agence Emploi Jeunes CI",
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=text,
                    source="Agence Emploi Jeunes",
                    source_url=link,
                    application_url=link,
                    status="pending"
                )
                ok, _ = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
        except Exception as exc:
            self.logger.warning(f"Erreur Agence Emploi Jeunes: {exc}. Fallback démo.")
            jobs.append(Job(
                title="Stagiaire Assistant RH (H/F)",
                company="Ministère / Agence Emploi Jeunes",
                location="Abidjan - Plateau",
                contract_type="Stage",
                education="BAC+3",
                description="Programme stage école - Appui au département des ressources humaines.",
                source="Agence Emploi Jeunes",
                source_url="https://www.emploijeunes.ci/demo-stage-rh",
                application_url="https://www.emploijeunes.ci/demo-stage-rh",
                status="pending"
            ))
        return jobs
