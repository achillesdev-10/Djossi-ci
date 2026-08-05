#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/emploiivoire.py
  Scraper pour EmploiIvoire.ci

  Structure vérifiée (2026-08) :
    - La page d'accueil liste les offres sous forme de cartes <article> :
      titre en <h3>, lien direct a[href*="/post/{id}"].
    - Les cartes « EXCLUSIF » (paywall) n'ont pas de lien /post/ (lien "#")
      → on itère sur les liens /post/ réels, ce qui exclut naturellement les
      annonces premium inaccessibles.
    - Les pages /post/{id} redirigent vers l'accueil (302) : on utilise donc
      directement le texte riche des cartes (EXCLUSIF, Niveau BAC+5,
      <Entreprise> recrute…, Profil recherché…).
===============================================================================
"""

from __future__ import annotations

from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job


class EmploiIvoireScraper(BaseScraper):
    name = "emploiivoire"
    base_url = "https://emploiivoire.ci"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.base_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.base_url)
        if soup is None:
            return jobs

        post_links = soup.select('a[href*="/post/"]')
        for a in post_links[:max_offers]:
            try:
                article = a.find_parent("article")
                h = article.select_one("h1, h2, h3, h4") if article else None
                title = h.get_text(" ", strip=True) if h else a.get_text(" ", strip=True)
                link = urljoin(self.base_url, a.get("href", ""))
                # Texte multi-lignes : le cleaner s'appuie sur les retours à la
                # ligne pour repérer headers/footers (get_text(" ") aplatirait
                # toute la carte sur une ligne et ferait échouer le nettoyage).
                text = article.get_text("\n", strip=True) if article else a.get_text(" ", strip=True)
                if not title or not link or len(title) < 5:
                    continue

                job = Job(
                    title=title,
                    company=self.guess_company(text, default="EmploiIvoire.ci"),
                    location=self.guess_location(text),
                    contract_type=self.guess_contract(text),
                    education=self.guess_education(text),
                    description=text,
                    deadline=self.extract_deadline(text),
                    source="EmploiIvoire.ci",
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
                self.logger.debug(f"Erreur sur une carte EmploiIvoire : {exc}")

        return jobs
