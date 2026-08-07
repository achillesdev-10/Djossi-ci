#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/core/robots_check.py
  Vérification robots.txt avant scraping d'une source de concours

  Respecte les directives d'exploration : si une source interdit le chemin
  ciblé, elle est ignorée (log + rapport) plutôt que forcée. Certains sites
  gouvernementaux ivoiriens renvoient un robots.txt non standard ou absent :
  dans ce cas on autorise l'exploration en lecture simple (documenté dans
  docs/CONCOURS_SOURCES.md).
===============================================================================
"""

from __future__ import annotations

from typing import Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

from scraper.core.logger import setup_logger

logger = setup_logger("robots_check")

USER_AGENT = "TravaillerEnCiBot/1.0 (veille concours administratifs; contact: achillesdev10@gmail.com)"


class RobotsResult:
    def __init__(self, allowed: bool, status: str, note: str = ""):
        self.allowed = allowed
        self.status = status  # "ok" | "disallowed" | "unreachable" | "non-standard"
        self.note = note

    def __repr__(self) -> str:  # pragma: no cover
        return f"RobotsResult(allowed={self.allowed}, status={self.status})"


def check_robots(http_client, base_url: str, path: str = "/") -> RobotsResult:
    """Vérifie si l'exploration de `base_url + path` est autorisée."""
    parsed = urlparse(base_url)
    robots_url = urljoin(f"{parsed.scheme}://{parsed.netloc}", "/robots.txt")

    try:
        resp = http_client.get(robots_url)
    except Exception as exc:
        logger.debug(f"robots.txt injoignable pour {robots_url} : {exc}")
        return RobotsResult(True, "unreachable", "robots.txt injoignable → exploration autorisée (lecture simple)")

    if resp.status_code >= 400:
        return RobotsResult(True, "unreachable", f"robots.txt absent (HTTP {resp.status_code}) → autorisé")

    body = resp.text or ""
    content_type = (resp.headers.get("content-type") or "").lower()
    if "text/plain" not in content_type and not body.lstrip().lower().startswith("user-agent"):
        # robots.txt non standard (ex. réponse XML de pare-feu du ministère).
        return RobotsResult(True, "non-standard", "robots.txt non standard → exploration autorisée en lecture simple")

    parser = RobotFileParser()
    parser.set_url(robots_url)
    try:
        parser.parse(body.splitlines())
        target = urljoin(f"{parsed.scheme}://{parsed.netloc}", path)
        allowed = parser.can_fetch(USER_AGENT, target)
    except Exception as exc:
        logger.debug(f"Parse robots.txt impossible pour {robots_url} : {exc}")
        return RobotsResult(True, "unreachable", "robots.txt illisible → autorisé (lecture simple)")

    status = "ok" if allowed else "disallowed"
    if not allowed:
        logger.warning(f"⛔ robots.txt INTERDIT l'exploration de {target} — source ignorée.")
    return RobotsResult(allowed, status)
