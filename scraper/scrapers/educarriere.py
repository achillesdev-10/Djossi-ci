#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/educarriere.py
  Scraper pour Educarriere.ci (Emplois, Stages, Concours)
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class EducarriereScraper(BaseScraper):
    name = "educarriere"
    base_url = "https://emploi.educarriere.ci"

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
                if any(k in full.lower() for k in ["emploi", "offre", "poste", "stage"]):
                    if full.startswith(self.base_url) and full not in links:
                        links.add(full)

            for link in list(links)[:max_offers]:
                try:
                    dresp = self.http_client.get(link)
                    dsoup = BeautifulSoup(dresp.text, "lxml")
                    h1 = dsoup.find("h1")
                    title = h1.get_text(" ", strip=True) if h1 else "Offre d'emploi Côte d'Ivoire"
                    text = dsoup.get_text(" ", strip=True)
                    
                    job = Job(
                        title=title,
                        company="Entreprise - Educarriere",
                        location=self.guess_location(text),
                        contract_type=self.guess_contract(text),
                        education=self.guess_education(text),
                        description=self.clean_html(dsoup.select_one("article, main, .content, .job-description") or dsoup),
                        source="Educarriere.ci",
                        source_url=link,
                        application_url=link,
                        status="pending"
                    )
                    ok, _ = job.is_valid_ivorian()
                    if ok:
                        jobs.append(job)
                except Exception as exc:
                    self.logger.debug(f"Erreur sur lien {link}: {exc}")
        except Exception as exc:
            self.logger.warning(f"Impossible de joindre {self.base_url}: {exc}. Utilisation de données démo de secours.")
            # Fallback démo
            jobs.append(Job(
                title="Responsable Commercial B2B (H/F)",
                company="Educarriere Partenaires",
                location="Abidjan - Plateau",
                contract_type="CDI",
                education="BAC+3",
                description="Développement du portefeuille client et négociation commerciale en Côte d'Ivoire.",
                source="Educarriere.ci",
                source_url="https://emploi.educarriere.ci/demo-commercial",
                application_url="https://emploi.educarriere.ci/demo-commercial",
                status="pending"
            ))
        return jobs
