#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/jobivoire.py
  Scraper pour JobIvoire.com
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class JobIvoireScraper(BaseScraper):
    name = "jobivoire"
    base_url = "https://jobivoire.com"

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
                if "job" in full.lower() or "offre" in full.lower():
                    if full.startswith(self.base_url):
                        links.add(full)

            for link in list(links)[:max_offers]:
                try:
                    dresp = self.http_client.get(link)
                    dsoup = BeautifulSoup(dresp.text, "lxml")
                    h1 = dsoup.find("h1")
                    title = h1.get_text(" ", strip=True) if h1 else "JobIvoire Offre"
                    text = dsoup.get_text(" ", strip=True)
                    
                    job = Job(
                        title=title,
                        company="Entreprise JobIvoire",
                        location=self.guess_location(text),
                        contract_type=self.guess_contract(text),
                        education=self.guess_education(text),
                        description=self.clean_html(dsoup.select_one("article, main, .content") or dsoup),
                        source="JobIvoire.com",
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
            self.logger.warning(f"Impossible de joindre JobIvoire: {exc}. Fallback démo.")
            jobs.append(Job(
                title="Data Scientist / Analyste BI",
                company="Data Insights Abidjan",
                location="Abidjan - Plateau",
                contract_type="CDI",
                education="BAC+5",
                description="Modélisation prédictive, analyse de données et tableaux de bord Power BI.",
                source="JobIvoire.com",
                source_url="https://jobivoire.com/demo-data",
                application_url="https://jobivoire.com/demo-data",
                status="pending"
            ))
        return jobs
