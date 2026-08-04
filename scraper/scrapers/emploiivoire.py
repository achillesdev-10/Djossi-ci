#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/emploiivoire.py
  Scraper pour EmploiIvoire.ci
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class EmploiIvoireScraper(BaseScraper):
    name = "emploiivoire"
    base_url = "https://emploiivoire.ci"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []
        try:
            resp = self.http_client.get(self.base_url)
            soup = BeautifulSoup(resp.text, "lxml")
            links = set()
            for a in soup.select("a[href]"):
                href = a.get("href", "")
                full = urljoin(self.base_url, href)
                if "emploi" in full.lower() or "offre" in full.lower():
                    if full.startswith(self.base_url):
                        links.add(full)

            for link in list(links)[:max_offers]:
                try:
                    dresp = self.http_client.get(link)
                    dsoup = BeautifulSoup(dresp.text, "lxml")
                    h1 = dsoup.find("h1")
                    title = h1.get_text(" ", strip=True) if h1 else "Offre Emploi Ivoire"
                    text = dsoup.get_text(" ", strip=True)
                    
                    job = Job(
                        title=title,
                        company="Entreprise EmploiIvoire",
                        location=self.guess_location(text),
                        contract_type=self.guess_contract(text),
                        education=self.guess_education(text),
                        description=self.clean_html(dsoup.select_one("article, main, .content") or dsoup),
                        source="EmploiIvoire.ci",
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
            self.logger.warning(f"Impossible de joindre EmploiIvoire: {exc}. Fallback démo.")
            jobs.append(Job(
                title="Responsable Administratif et Financier (H/F)",
                company="Holding Ivoire Commerce",
                location="Abidjan - Marcory",
                contract_type="CDI",
                education="BAC+5",
                description="Supervision de la comptabilité, contrôle de gestion et relations bancaires.",
                source="EmploiIvoire.ci",
                source_url="https://emploiivoire.ci/demo-raf",
                application_url="https://emploiivoire.ci/demo-raf",
                status="pending"
            ))
        return jobs
