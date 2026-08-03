#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper.py (Refondu avec ciblage ivoirien strict, source capture et IA Gemini)
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
from pathlib import Path
from typing import Optional

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

# Tentative d'import de Gemini SDK (google-genai)
try:
    from google import genai
    from google.genai import types
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "djossi-ci.sqlite3"
CACHE_PATH = HERE / ".http_cache.sqlite"


@dataclass(slots=True)
class RawOffer:
    title: str
    company: str
    location: str
    contract_type: str
    description: str
    source_url: str
    source_website: str
    status: str = "pending"
    apply_link: Optional[str] = None
    apply_email: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    slug: Optional[str] = None
    is_verified: bool = False

    def dedup_key(self) -> str:
        parts = [
            slugify(self.title, separator="-"),
            slugify(self.company or "inconnue", separator="-"),
            slugify(self.location or "", separator="-"),
        ]
        return "|".join(p for p in parts if p)

    def is_valid_ivorian(self) -> tuple[bool, str]:
        if not self.title or len(self.title.strip()) < 4:
            return False, "titre trop court"
        if not self.company or len(self.company.strip()) < 2:
            return False, "entreprise absente"
        if not self.description or len(self.description.strip()) < 30:
            return False, "description trop courte"
        if not self.source_url:
            return False, "source_url obligatoire"

        # Filtrage géographique strict Côte d'Ivoire
        ivorian_keywords = [
            "côte d'ivoire", "cote d'ivoire", "ivory coast", "abidjan", "yamoussoukro",
            "bouaké", "san-pedro", "san pedro", "daloa", "korhogo", "man", "gagnoa",
            "abobo", "cocody", "plateau", "treichville", "port-bouët", "port bouet",
            "koumassi", "adjamé", "yopougon", "marcory", "anyama", "bingerville", ".ci"
        ]
        text_corpus = f"{self.title} {self.location} {self.description} {self.source_url}".lower()
        if not any(kw in text_corpus for kw in ivorian_keywords):
            return False, "hors ciblage géographique ivoirien"

        return True, "ok"


class GeminiRewriter:
    """Utilise l'API Gemini pour réécrire et structurer l'offre d'emploi et générer les métadonnées SEO."""
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.client = None
        if HAS_GEMINI and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"⚠️ Erreur initialisation client Gemini : {e}", file=sys.stderr)

    def rewrite_offer(self, offer: RawOffer) -> RawOffer:
        if not self.client:
            # Fallback local sans IA
            offer.seo_title = f"{offer.title} chez {offer.company} - Emploi Côte d'Ivoire"
            offer.seo_description = f"Découvrez l'offre d'emploi {offer.title} à {offer.location} sur Djossi.ci."
            offer.seo_keywords = f"emploi, {offer.contract_type.lower()}, {offer.company.lower()}, abidjan, cote d'ivoire"
            offer.slug = slugify(f"{offer.title}-{offer.company}-{offer.location}", separator="-")
            return offer

        prompt = f"""
        Tu es un expert RH et rédacteur SEO en Côte d'Ivoire pour la plateforme d'emploi Djossi.ci.
        Analyse l'offre d'emploi brute ci-dessous et retourne un objet JSON valide (SANS markdown ```json ... ``` autour, uniquement du JSON brut) avec les clés exactes suivantes :
        - "title": Titre du poste propre et professionnel.
        - "company": Nom de l'entreprise recruteuse.
        - "location": Ville / Commune en Côte d'Ivoire (ex: "Abidjan - Plateau", "Yamoussoukro").
        - "contract_type": Un parmi ('CDI', 'CDD', 'Stage', 'Prestation', 'Alternance', 'Freelance').
        - "description": Description complète structurée en Markdown (À propos, Missions, Profil recherché, Avantages).
        - "seo_title": Titre optimisé pour les moteurs de recherche (max 65 caractères).
        - "seo_description": Méta-description persuasive pour Google et WhatsApp (max 160 caractères).
        - "seo_keywords": Mots-clés séparés par des virgules (ex: developpeur, abidjan, emploi).
        - "slug": Slug unique pour URL canonique (ex: developpeur-fullstack-abidjan).

        Offre brute :
        Titre : {offer.title}
        Entreprise : {offer.company}
        Lieu : {offer.location}
        Type de contrat : {offer.contract_type}
        Source URL : {offer.source_url}
        Contenu brut :
        {offer.description[:3000]}
        """

        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json"
                ),
            )
            data = json.loads(response.text)
            offer.title = data.get("title", offer.title)
            offer.company = data.get("company", offer.company)
            offer.location = data.get("location", offer.location)
            offer.contract_type = data.get("contract_type", offer.contract_type)
            offer.description = data.get("description", offer.description)
            offer.seo_title = data.get("seo_title", f"{offer.title} - Djossi.ci")
            offer.seo_description = data.get("seo_description", f"Postulez à l'offre {offer.title} en Côte d'Ivoire sur Djossi.ci.")
            offer.seo_keywords = data.get("seo_keywords", "emploi, cote d'ivoire, abidjan, recrutement")
            offer.slug = data.get("slug", slugify(offer.title, separator="-"))
        except Exception as exc:
            print(f"⚠️ Erreur réécriture Gemini : {exc}", file=sys.stderr)
            offer.seo_title = f"{offer.title} - {offer.company}"
            offer.seo_description = f"Offre d'emploi {offer.title} en Côte d'Ivoire."
            offer.slug = slugify(f"{offer.title}-{offer.company}", separator="-")

        return offer


class BaseSiteScraper:
    name: str = "base"
    base_url: str = "https://example.com"

    CONTRACT_PATTERNS = [
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
            "User-Agent": user_agent or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 DjossiCI/2.0",
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
        soup = html_content if isinstance(html_content, BeautifulSoup) else BeautifulSoup(str(html_content), "lxml")
        for tag in soup.find_all(["script", "style", "noscript", "iframe", "nav", "footer"]):
            tag.decompose()
        return soup.get_text("\n", strip=True)

    def scrape(self, max_offers: int) -> list[RawOffer]:
        raise NotImplementedError


class EducarriereScraper(BaseSiteScraper):
    name = "educarriere"
    base_url = "https://emploi.educarriere.ci"

    def scrape(self, max_offers: int) -> list[RawOffer]:
        url = self.base_url
        print(f"  🕸  [{self.name}] listing → {url}")
        resp = self._get(url)
        if not resp:
            return []
        soup = BeautifulSoup(resp.text, "lxml")
        collected: list[RawOffer] = []
        links: set[str] = set()

        for a in soup.select("a[href]"):
            href = a.get("href", "")
            full = urljoin(self.base_url, href)
            if "emploi" in full.lower() or "offre" in full.lower() or "poste" in full.lower():
                if full.startswith(self.base_url) and full not in links and len(full) > len(self.base_url) + 5:
                    links.add(full)

        for link in list(links)[:max_offers]:
            dresp = self._get(link)
            if not dresp:
                continue
            dsoup = BeautifulSoup(dresp.text, "lxml")
            h1 = dsoup.find("h1")
            title = h1.get_text(" ", strip=True) if h1 else "Offre d'emploi Côte d'Ivoire"
            page_text = dsoup.get_text(" ", strip=True)
            company = "Entreprise ivoirienne"
            for tag in dsoup.select("[class*='company'], [class*='employer'], [class*='societe']"):
                if len(t := tag.get_text(" ", strip=True)) > 2:
                    company = t
                    break

            collected.append(RawOffer(
                title=title,
                company=company,
                location=self.guess_location(page_text),
                contract_type=self.guess_contract(page_text),
                description=self.clean_html(dsoup.select_one("article, main, .content, .job-description") or dsoup),
                source_url=link,
                source_website="Educarriere.ci",
                status="pending",
                apply_link=link,
                is_verified=False
            ))
        return collected


class EmploiCiScraper(BaseSiteScraper):
    name = "emploici"
    base_url = "https://www.emploi.ci"

    def scrape(self, max_offers: int) -> list[RawOffer]:
        url = f"{self.base_url}/offres-d-emploi.html"
        print(f"  🕸  [{self.name}] listing → {url}")
        resp = self._get(url)
        if not resp:
            return []
        soup = BeautifulSoup(resp.text, "lxml")
        collected: list[RawOffer] = []
        links: set[str] = set()

        for a in soup.select("a[href*='emploi']"):
            href = a.get("href", "")
            full = urljoin(self.base_url, href)
            if full.startswith(self.base_url) and full not in links:
                links.add(full)

        for link in list(links)[:max_offers]:
            dresp = self._get(link)
            if not dresp:
                continue
            dsoup = BeautifulSoup(dresp.text, "lxml")
            h1 = dsoup.find("h1")
            title = h1.get_text(" ", strip=True) if h1 else "Offre Emploi CI"
            page_text = dsoup.get_text(" ", strip=True)
            company = "Entreprise Emploi.ci"

            collected.append(RawOffer(
                title=title,
                company=company,
                location=self.guess_location(page_text),
                contract_type=self.guess_contract(page_text),
                description=self.clean_html(dsoup.select_one("article, main, .job-details") or dsoup),
                source_url=link,
                source_website="Emploi.ci",
                status="pending",
                apply_link=link,
                is_verified=False
            ))
        return collected


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
                source_website="Demo Portal CI",
                status="pending",
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
                source_website="Demo Portal CI",
                status="pending",
                apply_email="recrutement@nsia.ci",
                is_verified=False
            )
        ][:max_offers]


SITE_REGISTRY = {
    "demo": DemoScraper,
    "educarriere": EducarriereScraper,
    "emploici": EmploiCiScraper,
}


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
              source_website  TEXT,
              status          TEXT NOT NULL DEFAULT 'pending',
              seo_title       TEXT,
              seo_description TEXT,
              seo_keywords    TEXT,
              slug            TEXT,
              is_verified     INTEGER NOT NULL DEFAULT 0,
              is_archived     INTEGER NOT NULL DEFAULT 0,
              is_expired      INTEGER NOT NULL DEFAULT 0,
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
            cur.execute("""
                UPDATE job_offers 
                SET contract_type = ?, location = ?, description = ?, source_website = ?, status = ?, seo_title = ?, seo_description = ?, seo_keywords = ?, slug = ?, updated_at = ? 
                WHERE id = ?
            """, (offer.contract_type, offer.location, offer.description, offer.source_website, offer.status, offer.seo_title, offer.seo_description, offer.seo_keywords, offer.slug, now, row_id))
            return row_id, False
        
        cur.execute("""
            INSERT INTO job_offers (title, company, location, contract_type, description, apply_link, apply_email, source_url, source_website, status, seo_title, seo_description, seo_keywords, slug, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            RETURNING id
        """, (offer.title, offer.company, offer.location, offer.contract_type, offer.description, offer.apply_link, offer.apply_email, offer.source_url, offer.source_website, offer.status, offer.seo_title, offer.seo_description, offer.seo_keywords, offer.slug, now, now))
        row = cur.fetchone()
        if row:
            return row[0], True
        return "", False

    def stats(self) -> dict:
        assert self.conn is not None
        cur = self.conn.execute("SELECT COUNT(*), SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) FROM job_offers;")
        tot, pen = cur.fetchone() or (0, 0)
        return {"total": tot or 0, "pending": pen or 0}


def run_pipeline(args: argparse.Namespace) -> int:
    session = requests_cache.CachedSession(str(CACHE_PATH.with_suffix("")), expire_after=3600) if HAS_CACHE and not args.no_cache else requests.Session()
    site_names = [s.strip().lower() for s in (args.sites or "demo").split(",") if s.strip()]
    
    rewriter = GeminiRewriter()
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
            # 1. Validation géographique ivoirienne stricte
            ok, reason = o.is_valid_ivorian()
            if not ok:
                print(f"  🚫 Offre rejetée ({reason}): {o.title} @ {o.company}", file=sys.stderr)
                continue
            
            # 2. Réécriture et génération SEO par IA (Gemini)
            print(f"  ✨ Réécriture IA Gemini pour : {o.title}")
            o = rewriter.rewrite_offer(o)
            
            # 3. Forcer le statut à 'pending' (en attente de modération)
            o.status = "pending"
            o.is_verified = False

            all_offers[o.dedup_key()] = o

    offers_list = list(all_offers.values())
    if args.dry_run:
        print(f"\n🧪 Mode --dry-run : {len(offers_list)} offres collectées et traitées.")
        for i, o in enumerate(offers_list, 1):
            print(f"  {i}. [{o.contract_type}] {o.title} — {o.company} ({o.location}) [status: {o.status}] [slug: {o.slug}]")
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

    print(f"\n✅ Terminé ! Nouvelles en attente (pending) : {created}, Mises à jour : {updated} (Total BDD : {st['total']}, Pending : {st['pending']})")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Djossi.ci Scraper multi-sites avec ciblage ivoirien strict & IA Gemini")
    parser.add_argument("--sites", type=str, default="demo,educarriere,emploici", help="Sites à scraper")
    parser.add_argument("--max-per-site", type=int, default=3)
    parser.add_argument("--no-cache", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-notify", action="store_true")
    args = parser.parse_args()
    sys.exit(run_pipeline(args))
