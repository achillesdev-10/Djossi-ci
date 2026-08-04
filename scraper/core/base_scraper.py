#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/core/base_scraper.py
  Classe de base abstraite pour tous les scrapers
===============================================================================
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List

from scraper.models.job import Job
from scraper.core.http_client import HttpClient
from scraper.core.logger import setup_logger
from scraper.core.utils import clean_html_text, extract_contract, extract_education, normalize_location


class BaseScraper(ABC):
    name: str = "base"
    base_url: str = "https://example.com"

    def __init__(self, http_client: HttpClient):
        self.http_client = http_client
        self.logger = setup_logger(f"scraper.{self.name}")

    @abstractmethod
    def scrape(self, max_offers: int = 20) -> List[Job]:
        pass

    def guess_contract(self, text: str) -> str:
        return extract_contract(text)

    def guess_education(self, text: str) -> Optional[str]:
        return extract_education(text)

    def guess_location(self, text: str) -> str:
        return normalize_location(text)

    def clean_html(self, html: str) -> str:
        return clean_html_text(html)
