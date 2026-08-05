#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/core/base_scraper.py
  Classe de base abstraite pour tous les scrapers
===============================================================================
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional

from bs4 import BeautifulSoup

from scraper.models.job import Job
from scraper.core.http_client import HttpClient
from scraper.core.logger import setup_logger
from scraper.core.utils import (
    clean_html_text,
    extract_contract,
    extract_education,
    extract_deadline,
    guess_company,
    normalize_location,
)


class BaseScraper(ABC):
    name: str = "base"
    base_url: str = "https://example.com"

    def __init__(self, http_client: HttpClient):
        self.http_client = http_client
        self.logger = setup_logger(f"scraper.{self.name}")

    @abstractmethod
    def scrape(self, max_offers: int = 20) -> List[Job]:
        pass

    def get_soup(self, url: str) -> BeautifulSoup | None:
        """Télécharge une page et la parse en BeautifulSoup (None en cas d'erreur)."""
        try:
            resp = self.http_client.get(url)
            return BeautifulSoup(resp.text, "lxml")
        except Exception as exc:
            self.logger.warning(f"Impossible de joindre {url}: {exc}")
            return None

    def guess_contract(self, text: str) -> str:
        return extract_contract(text)

    def guess_education(self, text: str) -> Optional[str]:
        return extract_education(text)

    def guess_location(self, text: str) -> str:
        return normalize_location(text)

    def guess_company(self, text: str, default: str = "Entreprise") -> str:
        return guess_company(text, default)

    def extract_deadline(self, text: str) -> Optional[datetime]:
        return extract_deadline(text)

    def clean_html(self, html: str) -> str:
        return clean_html_text(html)
