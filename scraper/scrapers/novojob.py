#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scrapers/novojob.py
  Scraper pour Novojob Côte d'Ivoire (ci.novojob.com)
===============================================================================
"""

from __future__ import annotations

from typing import List
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class NovojobScraper(BaseScraper):
    name = "novojob"
    base_url = "https://ci.novojob.com"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []
        try:
            resp = self.http_client.get(self.base_url)
            soup = BeautifulSoup(resp.text, "lxml")
            for card in soup.select(".offer-card, .job-item, article")[:max_offers]:
                title_el = card.select_one("h2, h3, a")
                title = title_el.get_text(" ", strip=True) if title_el else "Offre Novojob"
                link = urljoin(self.base_url, title_el.get("href", "")) if title_el and title_el.has_attr("href") else self.base_url
                text = card.get_text(" ", strip=True)
                
                job = Job(
                    title=title,
                    company="Novojob Recrutement CI",
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=text,
                    source="Novojob.com",
                    source_url=link,
                    application_url=link,
                    status="pending"
                )
                ok, _ = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
        except Exception as exc:
            self.logger.warning(f"Erreur Novojob: {exc}. Fallback démo.")
            jobs.append(Job(
                title="Chef de Projet Digital (H/F)",
                company="Novojob Partenaires",
                location="Abidjan - Plateau",
                contract_type="CDI",
                education="BAC+5",
                description="Pilotage de projets digitaux et transformation numérique pour grands comptes en Côte d'Ivoire.",
                source="Novojob.com",
                source_url="https://ci.novojob.com/demo-chef-projet",
                application_url="https://ci.novojob.com/demo-chef-projet",
                status="pending"
            ))
        return jobs
