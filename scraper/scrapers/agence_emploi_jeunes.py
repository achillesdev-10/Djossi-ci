#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/agence_emploi_jeunes.py
  Scraper pour Agence Emploi Jeunes (agenceemploijeunes.ci)

  Note : la plateforme officielle (agenceemploijeunes.ci) est une SPA —
  les offres sont chargées en JavaScript, sans contenu statique exploitable
  via HTTP simple. On tente un parsing best-effort avec un filtre strict
  (titres plausibles uniquement) ; à défaut, retour vide honnête (pas de
  fausses offres).
===============================================================================
"""

from __future__ import annotations

from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.job import Job

# Mots de navigation jamais considérés comme des titres d'offre.
_NAV_WORDS = ("accueil", "connexion", "inscription", "contact", "à propos", "a propos",
              "mentions", "politique", "rechercher", "tous les", "offres d'emploi",
              "nos services", "actualités", "se connecter")


class AgenceEmploiJeunesScraper(BaseScraper):
    name = "agence_emploi_jeunes"
    base_url = "https://agenceemploijeunes.ci"
    listing_url = "https://agenceemploijeunes.ci/offres-emploi"

    def scrape(self, max_offers: int = 15) -> List[Job]:
        self.logger.info(f"Scraping {self.name} -> {self.listing_url}")
        jobs: List[Job] = []

        soup = self.get_soup(self.listing_url)
        if soup is None:
            self.logger.warning("Agence Emploi Jeunes injoignable. Aucune offre récupérée.")
            return jobs

        # Best-effort : liens d'annonces rendus côté serveur (rare sur cette SPA).
        for a in soup.select('a[href*="offre"], a[href*="annonce"], a[href*="poste"]'):
            try:
                title = a.get_text(" ", strip=True)
                if len(title) < 15 or len(title) > 120:
                    continue
                low = title.lower()
                if any(w in low for w in _NAV_WORDS):
                    continue
                link = urljoin(self.base_url, a.get("href", ""))
                text = title
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
                    status="pending",
                )
                ok, reason = job.is_valid_ivorian()
                if ok:
                    jobs.append(job)
                if len(jobs) >= max_offers:
                    break
            except Exception as exc:
                self.logger.debug(f"Erreur sur un lien AEJ : {exc}")

        if not jobs:
            self.logger.warning(
                "Agence Emploi Jeunes : plateforme SPA, aucune offre récupérable en HTTP statique. "
                "Aucune donnée factice générée."
            )
        return jobs
