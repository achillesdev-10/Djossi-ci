#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/core/browser.py
  Gestionnaire Playwright pour les pages dynamiques / Single Page Applications
===============================================================================
"""

from __future__ import annotations

import asyncio
from typing import Optional
from playwright.async_api import async_playwright, Browser, Page

from scraper.core.logger import setup_logger

logger = setup_logger("browser")


class BrowserManager:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.playwright = None
        self.browser: Optional[Browser] = None

    async def __aenter__(self) -> BrowserManager:
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def fetch_page_content(self, url: str, wait_selector: Optional[str] = None) -> str:
        if not self.browser:
            raise RuntimeError("BrowserManager is not initialized via async context manager.")
        context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
        )
        page = await context.new_page()
        try:
            await page.goto(url, timeout=60000, wait_until="domcontentloaded")
            if wait_selector:
                try:
                    await page.wait_for_selector(wait_selector, timeout=10000)
                except Exception:
                    pass
            content = await page.content()
            return content
        except Exception as exc:
            logger.error(f"Erreur Playwright sur {url}: {exc}")
            return ""
        finally:
            await context.close()
