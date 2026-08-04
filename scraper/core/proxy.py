#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/core/proxy.py
  Gestion et rotation des proxys et User-Agents
===============================================================================
"""

from __future__ import annotations

import random
from typing import Optional
from fake_useragent import UserAgent


class ProxyManager:
    def __init__(self, proxies: Optional[list[str]] = None):
        self.proxies = proxies or []
        self.ua = UserAgent(fallback="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

    def get_random_user_agent(self) -> str:
        try:
            return self.ua.random
        except Exception:
            return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

    def get_random_proxy(self) -> Optional[dict]:
        if not self.proxies:
            return None
        proxy = random.choice(self.proxies)
        return {"http": proxy, "https": proxy}
