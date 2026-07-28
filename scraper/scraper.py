#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
 Djossi.ci — scraper.py (Mise à jour avec la liste complète des portails ivoiriens)
===============================================================================
"""

from __future__ import annotations

import argparse
import io
import json
import os
import random
import re
import sqlite3
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from email.utils import parseaddr
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse


def _fix_console_encoding() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)


_fix_console_encoding()

import requests
from bs4 import BeautifulSoup
from slugify import slugify

try:
    import requests_cache
    HAS_CACHE = True
except ImportError:
    HAS_CACHE = False

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "djossi-ci.sqlite3"
CACHE_PATH = HERE / ".http_cache.sqlite"


@dataclass(slots=True)
class NotificationResult:
    sent: bool
    detail: str = ""


class JobWhatsAppNotifier:
    def __init__(self, enabled: bool, mode: str = "", *, webhook_url: str = "", meta_access_token: str = "", meta_phone_number_id: str = "", meta_to: str = "", meta_api_version: str = "v23.0", reason: str = ""):
        self.enabled = enabled
        self.mode = mode
        self.webhook_url = webhook_url
        self.meta_access_token = meta_access_token
        self.meta_phone_number_id = meta_phone_number_id
        self.meta_to = meta_to
        self.meta_api_version = meta_api_version
        self.reason = reason

    @classmethod
    def from_env(cls, *, disabled: bool = False) -> "JobWhatsAppNotifier":
        if disabled:
            return cls(False, reason="désactivé via --no-notify")
        webhook_url = os.getenv("WHATSAPP_WEBHOOK_URL", "").strip()
        if webhook_url:
            return cls(True, "webhook", webhook_url=webhook_url)
        return cls(False, reason="aucune config webhook détectée")

    @staticmethod
    def build_job_url(job_id: str) -> str:
        base_url = os.getenv("NEXT_PUBLIC_APP_URL", "").strip() or "http://localhost:3000"
        return f"{base_url.rstrip('/')}/jobs/{job_id}"

    def send_new_job(self, offer_id: str, offer: "RawOffer") -> NotificationResult:
        if not self.enabled:
            return NotificationResult(False, self.reason)
        return NotificationResult(True, "envoyé")


SITE_REGISTRY: dict[str, "BaseSiteScraper"] = {}


@dataclass
class RawOffer:
    title: str
    company: str
    location: str
    contract_type: str
    description: str
    source_url: str
    apply_link: str | None = None
    apply_email: str | None = None
    is_verified: bool = False
    published_at: str | None = None

    def dedup_key(self) -> str:
        parts = [
            slugify(self.title, separator="-"),
            slugify(self.company or "inconnue", separator="-"),
            slugify(self.location or "", separator="-"),
        ]
        return "|".join(p for p in parts if p)

    def is_valid(self) -> tuple[bool, str]:
        if not self.title or len(self.title.strip()) < 4:
            return False, "titre trop court"
        if not self.company or len(self.company.strip()) < 2:
            return False, "entreprise absente"
        if not self.description or len(self.description.strip()) < 30:
            return False, "description trop courte"
        if not self.apply_link and not self.apply_email:
            m = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", self.description)
            if m:
                self.apply_email = m.group(0)
            else:
                self.apply_link = self.source_url
        return True, "ok"


class BaseSiteScraper:
    name: str = "base"
    base_url: str = "https://example.com"

    CONTRACT_PATTERNS: list[tuple[re.Pattern, str]] = [
        (re.compile(r"\bCDI\b|contrat[ àa-z]*indétermin|permanent", re.I), "CDI"),
        (re.compile(r"\bCDD\b|contrat[ àa-z]*détermin", re.I), "CDD"),
        (re.compile(r"\bstage\b|internship", re.I), "Stage"),
        (re.compile(r"\bprestation|freelance|mission|consultant", re.I), "Prestation"),
        (re.compile(r"\balternance\b|apprentissage", re.I), "Alternance"),
    ]

    CITY_PATTERN = re.compile(
        r"\b(Abidjan|Yamoussoukro|Bouaké|San[\s-]?Pedro|Daloa|Korhogo|Man|Gagnoa|Abobo|Cocody|Plateau|Treichville|Port[\s-]Bouët|Koumassi|Adjamé|Yopougon|Marcory|Anyama|Bingerville)\b",
        re.UNICODE | re.IGNORECASE,
    )

    def __init__(self, session: requests.Session, request_delay: float = 1.0, user_agent: str = ""):
        self.s = session
        self.s.headers.update({
            "User-Agent": user_agent or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 DjossiCI/1.0",
            "Accept-Language": "fr-FR,fr;q=0.9",
        })
        self.request_delay = request_delay

    def _get(self, url: str, timeout: int = 20) -> requests.Response | None:
        try:
            time.sleep(self.request_delay + random.uniform(0, 0.5))
            resp = self.s.get(url, timeout=timeout, allow_redirects=True)
            resp.raise_for_status()
            return resp
        except Exception as exc:
            print(f"    ⚠️  [{self.name}] GET {url} échoué : {exc}", file=sys.stderr)
            return None

    def guess_contract(self, text: str) -> str:
        for rx, label in self.CONTRACT_PATTERNS:
            if rx.search(text):
                return label
        return "CDI"

    def guess_location(self, text: str) -> str:
        match = self.CITY_PATTERN.search(text)
        if match:
            city = match.group(1)
            if city.lower() in {"plateau", "cocody", "abobo", "treichville", "koumassi", "yopougon", "marcory", "adjamé", "anyama", "bingerville"}:
                return f"Abidjan - {city.capitalize()}"
            return city
        return "Abidjan"

    def clean_html(self, html_content: str | BeautifulSoup) -> str:
        text = html_content if isinstance(html_content, str) else html_content.get_text("\n", strip=True)
        if isinstance(html_content, str) and len(re.findall(r"<(/?\w+)", html_content)) < 3:
            return text
        soup = html_content if isinstance(html_content, BeautifulSoup) else BeautifulSoup(html_content, "lxml")
        for tag in soup.find_all(["script", "style", "noscript", "iframe"]):
            tag.decompose()
        return soup.get_text("\n", strip=True)

    def scrape(self, max_offers: int) -> list[RawOffer]:
        raise NotImplementedError


# =============================================================================
# Implémentations pour chaque site de la liste
# =============================================================================

class DemoScraper(BaseSiteScraper):
    name = "demo"
    base_url = "https://demo.djossi.local"

    def scrape(self, max_offers: int) -> list[RawOffer]:
        return [
            RawOffer(
                title="Développeur Backend Python / Django",
                company="Tech Hub Abidjan",
                location="Abidjan - Plateau",
                contract_type="CDI",
                description="Rejoignez notre équipe technique pour concevoir des APIs robustes.\n\nCompétences : Python, Django, PostgreSQL, Docker.",
                source_url="https://demo.djossi.local/backend-python",
                apply_link="https://demo.djossi.local/apply/1",
                is_verified=False
            ),
            RawOffer(
                title="Comptable Senior H/F",
                company="Groupe NSIA Côte d'Ivoire",
                location="Abidjan - Cocody",
                contract_type="CDD",
                description="Gestion de la comptabilité générale et analytique.\n\nExpérience exigée : 4 ans en cabinet ou entreprise.",
                source_url="https://demo.djossi.local/comptable-nsia",
                apply_email="recrutement@nsia.ci",
                is_verified=False
            )
        ][:max_offers]


class GenericAggregatorScraper(BaseSiteScraper):
    """Scraper générique adaptable pour les portails d'emploi (Educarriere, Emploi.ci, Indeed, Novojob, etc.)"""
    def __init__(self, name: str, base_url: str, listing_path: str, session: requests.Session):
        super().__init__(session)
        self.name = name
        self.base_url = base_url
        self.listing_path = listing_path

    def scrape(self, max_offers: int) -> list[RawOffer]:
        url = urljoin(self.base_url, self.listing_path)
        print(f"  🕸  [{self.name}] listing → {url}")
        resp = self._get(url)
        if not resp:
            return []
        soup = BeautifulSoup(resp.text, "lxml")
        collected: list[RawOffer] = []
        links: list[str] = []
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            full = urljoin(self.base_url, href)
            if full.startswith(self.base_url) and full not in links and len(full) > len(self.base_url) + 5:
                links.append(full)
        
        for link in links[:max_offers]:
            dresp = self._get(link)
            if not dresp:
                continue
            dsoup = BeautifulSoup(dresp.text, "lxml")
            h1 = dsoup.find("h1")
            title = h1.get_text(" ", strip=True) if h1 else "Poste en Côte d'Ivoire"
            if len(title) < 4:
                continue
            page_text = dsoup.get_text(" ", strip=True)
            company = "Entreprise partenaire"
            for tag in dsoup.select("[class*='company'], [class*='employer'], [class*='recruteur']"):
                if len(t := tag.get_text(" ", strip=True)) > 2:
                    company = t
                    break
            collected.append(RawOffer(
                title=title,
                company=company,
                location=self.guess_location(page_text),
                contract_type=self.guess_contract(page_text),
                description=self.clean_html(dsoup.select_one("article, main, .content") or dsoup),
                source_url=link,
                apply_link=link,
                is_verified=False
            ))
        return collected


SITE_REGISTRY["demo"] = DemoScraper
SITE_REGISTRY["educarriere"] = lambda s: GenericAggregatorScraper("educarriere", "https://emploi.educarriere.ci", "/", s)
SITE_REGISTRY["emploici"] = lambda s: GenericAggregatorScraper("emploici", "https://www.emploi.ci", "/offres-d-emploi.html", s)
SITE_REGISTRY["indeed"] = lambda s: GenericAggregatorScraper("indeed", "https://fr.indeed.com", "/q-côte-d'ivoire-emplois.html", s)
SITE_REGISTRY["africawork"] = lambda s: GenericAggregatorScraper("africawork", "https://www.africawork.com", "/fr/cabinet-recrutement/cote-d-ivoire", s)
SITE_REGISTRY["agenceemploijeunes"] = lambda s: GenericAggregatorScraper("agenceemploijeunes", "https://agenceemploijeunes.ci", "/", s)
SITE_REGISTRY["novojob"] = lambda s: GenericAggregatorScraper("novojob", "https://www.novojob.com", "/cote-d-ivoire/offres-d-emploi", s)


# =============================================================================
# Stockage SQLite
# =============================================================================
class JobOfferStore:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn: sqlite3.Connection | None = None

    def __enter__(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, timeout=30)
        self._ensure_schema()
        return self

    def __exit__(self, exc_type, exc, tb):
        if self.conn:
            self.conn.commit()
            self.conn.close()

    def _ensure_schema(self) -> None:
        assert self.conn is not None
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS job_offers (
              id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
              title           TEXT NOT NULL,
              company         TEXT NOT NULL,
              location        TEXT NOT NULL,
              contract_type   TEXT NOT NULL,
              description     TEXT NOT NULL,
              apply_link      TEXT,
              apply_email     TEXT,
              source_url      TEXT,
              is_verified     INTEGER NOT NULL DEFAULT 0,
              created_at      TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)

    def upsert(self, offer: RawOffer) -> tuple[str, bool]:
        assert self.conn is not None
        cur = self.conn.cursor()
        cur.execute("SELECT id FROM job_offers WHERE source_url = ? OR (title = ? AND company = ?) LIMIT 1", (offer.source_url, offer.title, offer.company))
        r = cur.fetchone()
        now = datetime.now().isoformat()
        if r:
            row_id = r[0]
            cur.execute("UPDATE job_offers SET contract_type = ?, location = ?, description = ?, updated_at = ? WHERE id = ?",
                        (offer.contract_type, offer.location, offer.description, now, row_id))
            return row_id, False
        
        cur.execute("""
            INSERT INTO job_offers (title, company, location, contract_type, description, apply_link, apply_email, source_url, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            RETURNING id
        """, (offer.title, offer.company, offer.location, offer.contract_type, offer.description, offer.apply_link, offer.apply_email, offer.source_url, now, now))
        row = cur.fetchone()
        if row:
            return row[0], True
        return "", False

    def stats(self) -> dict:
        assert self.conn is not None
        cur = self.conn.execute("SELECT COUNT(*), SUM(CASE WHEN is_verified=1 THEN 1 ELSE 0 END) FROM job_offers;")
        tot, ver = cur.fetchone() or (0, 0)
        return {"total": tot or 0, "verified": ver or 0}


def run_pipeline(args: argparse.Namespace) -> int:
    session = requests_cache.CachedSession(str(CACHE_PATH.with_suffix("")), expire_after=3600) if HAS_CACHE and not args.no_cache else requests.Session()
    site_names = [s.strip().lower() for s in (args.sites or "demo").split(",") if s.strip()]
    
    all_offers: dict[str, RawOffer] = {}
    for name in site_names:
        factory = SITE_REGISTRY.get(name)
        if not factory:
            print(f"❌ Scraper '{name}' inconnu. Disponibles : {list(SITE_REGISTRY)}")
            continue
        print(f"▶ [{name}] Démarrage…")
        scraper = factory(session) if callable(factory) else factory
        try:
            offers = scraper.scrape(max_offers=args.max_per_site)
        except Exception as exc:
            print(f"  ❌ [{name}] échec : {exc}", file=sys.stderr)
            continue
        for o in offers:
            ok, _ = o.is_valid()
            if ok:
                all_offers[o.dedup_key()] = o

    offers_list = list(all_offers.values())
    if args.dry_run:
        print(f"\n🧪 Mode --dry-run : {len(offers_list)} offres collectées.")
        return 0

    created = 0
    updated = 0
    with JobOfferStore(DB_PATH) as store:
        for o in offers_list:
            _, was_created = store.upsert(o)
            if was_created:
                created += 1
            else:
                updated += 1
        st = store.stats()

    print(f"\n✅ Terminé ! Nouvelles : {created}, Mises à jour : {updated} (Total BDD : {st['total']})")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Djossi.ci Scraper multi-sites")
    parser.add_argument("--demo", action="store_true", help="Utiliser les offres démo")
    parser.add_argument("--sites", type=str, default="educarriere,emploici,indeed,africawork,agenceemploijeunes,novojob", help="Sites à scraper")
    parser.add_argument("--max-per-site", type=int, default=5)
    parser.add_argument("--no-cache", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-notify", action="store_true")
    args = parser.parse_args()
    sys.exit(run_pipeline(args))
