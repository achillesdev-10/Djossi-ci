#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/scrapers/boursedetude.py
  Scraper Bourse d'étude (boursedetude.org) — Bourses d'études en français

  Source : https://www.boursedetude.org  (VÉRIFIÉ — API REST WordPress OK)

  L'API REST publique renvoie les derniers articles « bourse » :
      GET /wp-json/wp/v2/posts?per_page=40&_fields=id,title,link,date,content,excerpt

  Chaque article est transformé en contenu de catégorie « scholarship »
  (financement d'études — pertinent pour les étudiants ivoiriens).
===============================================================================
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import List
from urllib.parse import urljoin

from scraper.core.base_scraper import BaseScraper
from scraper.models.content_item import ContentItem
from scraper.core.utils import clean_html_text

_API = "https://www.boursedetude.org/wp-json/wp/v2/posts?per_page={n}&_fields=id,title,link,date,content,excerpt"

# Pays / destinations fréquents dans les titres de bourses (normalisation du lieu).
_COUNTRIES = {
    "france": "France",
    "canada": "Canada",
    "allemagne": "Allemagne",
    "etats-unis": "États-Unis",
    "etats unis": "États-Unis",
    "usa": "États-Unis",
    "royaume-uni": "Royaume-Uni",
    "angleterre": "Angleterre",
    "australie": "Australie",
    "japon": "Japon",
    "chine": "Chine",
    "coree": "Corée du Sud",
    "suisse": "Suisse",
    "belgique": "Belgique",
    "italie": "Italie",
    "espagne": "Espagne",
    "pays-bas": "Pays-Bas",
    "danemark": "Danemark",
    "islande": "Islande",
    "portugal": "Portugal",
    "luxembourg": "Luxembourg",
    "mexique": "Mexique",
    "bresil": "Brésil",
    "taiwan": "Taïwan",
    "afrique du sud": "Afrique du Sud",
    "cote d'ivoire": "Côte d'Ivoire",
    "senegal": "Sénégal",
}


def _guess_organization(title: str) -> str:
    """Extrait l'université / école / institut depuis le titre d'une bourse.
    Ex. « Bourses d'étude de l'Université d'Islande » → « Université d'Islande »."""
    m = re.search(
        r"(?:de|à|par)\s+l[’']?(Universit[ée][^,;]{3,70}|École[^,;]{3,60}|Institut[^,;]{3,60}|Centre[^,;]{3,60})",
        title,
        re.I,
    )
    if m:
        org = m.group(1).strip().rstrip(". ,;:").strip()
        if len(org) >= 4:
            return org[:90]
    return "Organisme de bourse d'études"


def _guess_destination(title: str) -> str:
    low = title.lower()
    for key, label in _COUNTRIES.items():
        if key in low:
            return label
    return "International"


class BourseDetudeScraper(BaseScraper):
    name = "boursedetude"
    base_url = "https://www.boursedetude.org"
    source_label = "Bourse d'étude (boursedetude.org)"

    def scrape(self, max_offers: int = 40) -> List[ContentItem]:
        self.logger.info(f"Scraping {self.name} -> API REST WordPress")
        items: List[ContentItem] = []
        api_url = _API.format(n=max(10, min(max_offers, 100)))

        raw = self.get_text(api_url)
        if not raw:
            self.logger.warning(f"  Impossible de joindre {api_url}")
            return items

        try:
            posts = json.loads(raw)
        except Exception as exc:
            self.logger.error(f"  JSON illisible depuis l'API : {exc}")
            return items

        for post in posts[:max_offers]:
            try:
                title = (post.get("title") or {}).get("rendered", "").strip()
                title = re.sub(r"<[^>]+>", "", title).strip()
                if not title:
                    continue

                content_html = (post.get("content") or {}).get("rendered", "")
                description = clean_html_text(content_html) if content_html else ""
                if len(description) < 30:
                    excerpt = (post.get("excerpt") or {}).get("rendered", "")
                    description = clean_html_text(excerpt) if excerpt else description

                link = post.get("link", "").strip()
                if not link.startswith("http"):
                    link = urljoin(self.base_url, link)

                published = post.get("date")
                deadline = self.extract_deadline(description)
                emails = self.extract_emails(description)

                item = ContentItem(
                    category="scholarship",
                    title=title[:200],
                    company=_guess_organization(title),
                    location=_guess_destination(title),
                    contract_type="CDI",  # valeur neutre — jamais affichée pour les bourses
                    description=description[:12000],
                    deadline=deadline,
                    application_url=link,
                    application_email=emails[0] if emails else None,
                    source=self.source_label,
                    source_url=link,
                    status="pending",
                )
                if published:
                    try:
                        item.scraped_at = datetime.fromisoformat(published.replace("Z", "+00:00"))
                    except ValueError:
                        pass

                ok, reason = item.is_valid()
                if ok:
                    items.append(item)
                else:
                    self.logger.debug(f"  🚫 Rejeté ({reason}) : {title[:60]}")
            except Exception as exc:
                self.logger.debug(f"Erreur sur un article : {exc}")

        self.logger.info(f"  ✓ {self.name} : {len(items)} bourses collectées.")
        return items
