#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/core/http_client.py
  Client HTTP robuste (httpx) avec retry, gestion 403 / Cloudflare, timeouts
===============================================================================
"""

from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from scraper.core.proxy import ProxyManager
from scraper.core.logger import setup_logger

logger = setup_logger("http_client")


class HttpClient:
    def __init__(self, timeout: float = 30.0, use_cache: bool = True):
        self.timeout = timeout
        self.proxy_manager = ProxyManager()
        self.client = httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={
                "User-Agent": self.proxy_manager.get_random_user_agent(),
                "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
            }
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException, httpx.HTTPStatusError)),
        reraise=True
    )
    def get(self, url: str) -> httpx.Response:
        headers = {"User-Agent": self.proxy_manager.get_random_user_agent()}
        resp = self.client.get(url, headers=headers)
        if resp.status_code == 403 or "cloudflare" in resp.text.lower():
            logger.warning(f"⚠️ Blocage potentiel (403 / Cloudflare) détecté sur {url}")
        resp.raise_for_status()
        return resp

    def close(self):
        self.client.close()
