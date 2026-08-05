#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/jobivoire2.py
  Scraper pour JobIvoire.ci (www.jobivoire.ci/job)

  Structure vérifiée (2026-08) :
    - Listing  : https://www.jobivoire.ci/job → cartes `.job-item`
                 (titre en h2/h3, lien vers /job/details/{slug})
    - Détail   : /job/details/{slug} → description dans <main>
===============================================================================
"""

from __future__ import annotations

from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class JobIvoire2Scraper(BaseScraper):
    name = "jobivoire2"
    base_url = "https://www.jobivoire.ci"
    listing_url = "https://www.jobivoire.ci/job"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.listing_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.listing_url)
        if soup is None:
            return jobs

        cards = soup.select(".job-item")[:max_offers]
        for card in cards:
            try:
                title_el = card.select_one("h2, h3, h4")
                title = title_el.get_text(" ", strip=True) if title_el else None
                link_el = card.select_one('a[href*="/job/details/"]')
                link = urljoin(self.base_url, link_el.get("href", "")) if link_el else None
                if not title or not link:
                    continue

                card_text = card.get_text(" ", strip=True)
                detail_text = card_text
                description = card_text

                # Enrichit la description avec la page détail.
                dsoup = self.get_soup(link)
                if dsoup is not None:
                    main_el = dsoup.select_one("main") or dsoup.select_one("article") or dsoup.select_one(".job-details")
                    if main_el:
                        detail_text = main_el.get_text(" ", strip=True)
                        description = detail_text

                company = "Recruteur confidentiel" if "recruteur confidentiel" in detail_text.lower() else "JobIvoire.ci"

                job = Job(
                    title=title,
                    company=company,
                    location=self.guess_location(f"{card_text} {detail_text}"),
                    contract_type=self.guess_contract(f"{card_text} {detail_text}"),
                    education=self.guess_education(detail_text or card_text),
                    description=description,
                    deadline=self.extract_deadline(f"{card_text} {detail_text}"),
                    source="JobIvoire.ci",
                    source_url=link,
                    application_url=link,
                    status="pending",
                )
                ok, reason = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
                else:
                    self.logger.debug(f"  🚫 Rejeté ({reason}) : {title}")
            except Exception as exc:
                self.logger.debug(f"Erreur sur une carte JobIvoire.ci : {exc}")

        return jobs
