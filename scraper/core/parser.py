#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/core/parser.py
  Parser HTML unifié utilisant selectolax et BeautifulSoup4
===============================================================================
"""

from __future__ import annotations

from bs4 import BeautifulSoup
from selectolax.parser import HTMLParser


class UnifiedParser:
    def __init__(self, html_content: str):
        self.html_content = html_content
        self.soup = BeautifulSoup(html_content, "lxml")
        self.selectolax = HTMLParser(html_content)

    def extract_text(self, css_selector: str) -> str:
        node = self.selectolax.css_first(css_selector)
        if node:
            return node.text(strip=True)
        return ""

    def extract_all_texts(self, css_selector: str) -> list[str]:
        return [node.text(strip=True) for node in self.selectolax.css(css_selector)]

    def extract_attr(self, css_selector: str, attr: str) -> str:
        node = self.selectolax.css_first(css_selector)
        if node:
            return node.attributes.get(attr, "")
        return ""
