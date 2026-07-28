#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
 Djossi.ci — scraper.py
===============================================================================
Scrape les offres d'emploi publiques de sites ivoiriens, nettoie/normalise les
champs, et insère le résultat dans la base de données SQLite du projet
(data/djossi-ci.sqlite3) — en SANS CRÉER DE DOUBLONS (contrainte UNIQUE sur
(title, company) dans le schéma SQL + stratégie de détection heuristique).

Champs extraits :
    - title (titre du poste)
    - company (nom entreprise)
    - location (ville : Abidjan, Bouaké, Yamoussoukro, Cocody… / type de lieu)
    - contract_type (CDI, CDD, Stage, Prestation, Alternance, Freelance)
    - description (fiche de poste nettoyée, Markdown minimal)
    - apply_link (URL de candidature)
    - apply_email (email de recrutement, si trouvé)
    - source_url (URL de la page d'origine — transparence)
    - is_verified (False par défaut — sera validé par l'équipe Djossi)

USAGE :
    # 1) une seule fois - dans le dossier scraper/ :
    cd scraper/
    python -m venv .venv
    # PowerShell Windows :
    #   venv\\Scripts\\activate
    pip install -r requirements.txt

    # 2) lancer le scraper (par defaut : DEMO_MODE avec HTML stub, pour tester)
    python scraper.py --demo

    # 3) lancer un scrape reel des sites (rate limited + cache HTTP)
    python scraper.py --max-per-site 20 --sites jobberman,emploici

    # 4) NE PAS inserer dans la BDD, juste afficher ce qui aurait ete insere :
    python scraper.py --dry-run

    # 5) exporter en JSON + inserer en BDD :
    python scraper.py --output ../data/scraped_offers.json

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
from dataclasses import dataclass, asdict, field
from datetime import datetime
from email.utils import parseaddr
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse


# ---------- Unicode safe stdout/stderr (Windows console CP1252 fix) ----------
def _fix_console_encoding() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        # Python < 3.7 / cas atypiques : wrap TextIOWrapper UTF-8
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)


_fix_console_encoding()

# ---------- 3rd-party --------------------------------------------------------
import requests
from bs4 import BeautifulSoup
from slugify import slugify

try:  # requests-cache est optionnel : accelere les dev en conservant HTTP 1h
    import requests_cache
    HAS_CACHE = True
except ImportError:
    HAS_CACHE = False

# ---------- Chemin projet ----------------------------------------------------
HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "djossi-ci.sqlite3"
CACHE_PATH = HERE / ".http_cache.sqlite"


def load_env_files(paths: Iterable[Path]) -> None:
    """Charge simplement les couples KEY=VALUE depuis .env.local/.env sans dépendance externe."""
    for path in paths:
        if not path.exists() or not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except OSError:
            continue
        for raw_line in content.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[len("export "):].strip()
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                os.environ.setdefault(key, value)


load_env_files((PROJECT_ROOT / ".env.local", PROJECT_ROOT / ".env", HERE / ".env"))


@dataclass(slots=True)
class NotificationResult:
    sent: bool
    detail: str = ""


class JobWhatsAppNotifier:
    """Envoie les nouvelles offres via un webhook générique ou Meta WhatsApp Cloud API."""

    def __init__(
        self,
        enabled: bool,
        mode: str = "",
        *,
        webhook_url: str = "",
        meta_access_token: str = "",
        meta_phone_number_id: str = "",
        meta_to: str = "",
        meta_api_version: str = "v23.0",
        reason: str = "",
    ):
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

        meta_access_token = os.getenv("WHATSAPP_META_ACCESS_TOKEN", "").strip()
        meta_phone_number_id = os.getenv("WHATSAPP_META_PHONE_NUMBER_ID", "").strip()
        meta_to = os.getenv("WHATSAPP_META_TO", "").strip()
        meta_api_version = os.getenv("WHATSAPP_META_API_VERSION", "v23.0").strip() or "v23.0"

        if meta_access_token and meta_phone_number_id and meta_to:
            return cls(
                True,
                "meta",
                meta_access_token=meta_access_token,
                meta_phone_number_id=meta_phone_number_id,
                meta_to=meta_to,
                meta_api_version=meta_api_version,
            )

        return cls(
            False,
            reason=(
                "aucune config détectée "
                "(WHATSAPP_WEBHOOK_URL ou WHATSAPP_META_ACCESS_TOKEN/PHONE_NUMBER_ID/TO)"
            ),
        )

    @staticmethod
    def build_job_url(job_id: str) -> str:
        base_url = (
            os.getenv("NEXT_PUBLIC_APP_URL", "").strip()
            or os.getenv("APP_URL", "").strip()
            or "http://localhost:3000"
        )
        return f"{base_url.rstrip('/')}/jobs/{job_id}"

    def format_message(self, offer_id: str, offer: "RawOffer") -> str:
        job_url = self.build_job_url(offer_id)
        return "\n".join(
            [
                "Nouvelle offre Djossi.ci",
                f"Titre : {offer.title.strip()}",
                f"Ville : {offer.location.strip()}",
                f"Lien : {job_url}",
            ]
        )

    def send_new_job(self, offer_id: str, offer: "RawOffer") -> NotificationResult:
        if not self.enabled:
            return NotificationResult(False, self.reason)

        message = self.format_message(offer_id, offer)
        payload = {
            "event": "job_offer.created",
            "channel": "whatsapp",
            "job": {
                "id": offer_id,
                "title": offer.title.strip(),
                "company": offer.company.strip(),
                "location": offer.location.strip(),
                "url": self.build_job_url(offer_id),
                "source_url": offer.source_url,
                "is_verified": offer.is_verified,
            },
            "message": message,
        }

        try:
            if self.mode == "webhook":
                response = requests.post(self.webhook_url, json=payload, timeout=15)
            elif self.mode == "meta":
                response = requests.post(
                    (
                        f"https://graph.facebook.com/{self.meta_api_version}/"
                        f"{self.meta_phone_number_id}/messages"
                    ),
                    headers={
                        "Authorization": f"Bearer {self.meta_access_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": self.meta_to,
                        "type": "text",
                        "text": {
                            "preview_url": True,
                            "body": message,
                        },
                    },
                    timeout=15,
                )
            else:
                return NotificationResult(False, f"mode inconnu: {self.mode}")

            response.raise_for_status()
            return NotificationResult(True, f"mode={self.mode}")
        except requests.RequestException as exc:
            return NotificationResult(False, str(exc))

# ---------- Sites ivoiriens supportés ----------------------------------------
SITE_REGISTRY: dict[str, "BaseSiteScraper"] = {}


# =============================================================================
# Modèle de données normalisé (1 offre = 1 RawOffer)
# =============================================================================
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
    published_at: str | None = None      # ISO 8601, deviné si possible

    # ---------- Détection de doublons --------------------------------------
    def dedup_key(self) -> str:
        """Clé stable pour comparer 2 offres (ignore cas, accents, ponctuation)."""
        parts = [
            slugify(self.title, separator="-"),
            slugify(self.company or "inconnue", separator="-"),
            slugify(self.location or "", separator="-"),
        ]
        return "|".join(p for p in parts if p)

    # ---------- Validations légères ----------------------------------------
    def is_valid(self) -> tuple[bool, str]:
        if not self.title or len(self.title.strip()) < 4:
            return False, "titre trop court"
        if not self.company or len(self.company.strip()) < 2:
            return False, "entreprise absente"
        if not self.description or len(self.description.strip()) < 40:
            return False, "description trop courte (<40 chars)"
        if not self.apply_link and not self.apply_email:
            # On cherche un email DANS la description pour rattraper
            m = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", self.description)
            if m:
                self.apply_email = m.group(0)
            else:
                return False, "aucun moyen de postuler (link/mail)"
        # Vérifie/force l'email
        if self.apply_email:
            _, addr = parseaddr(self.apply_email)
            if "@" not in addr:
                self.apply_email = None
            else:
                self.apply_email = addr.lower()
        return True, "ok"


# =============================================================================
# Base des scrapers — 1 sous-classe par site ivoirien
# =============================================================================
class BaseSiteScraper:
    name: str = "base"
    base_url: str = "https://example.com"
    search_paths: list[str] = ["/"]

    # Pattern heuristiques de contract_type
    CONTRACT_PATTERNS: list[tuple[re.Pattern, str]] = [
        (re.compile(r"\bCDI\b|contrat[ àa-z]*indétermin|permanent|full[ -]time.*cdi", re.I), "CDI"),
        (re.compile(r"\bCDD\b|contrat[ àa-z]*détermin|fixed[ -]term", re.I), "CDD"),
        (re.compile(r"\bstage\b|internship|formation\s*pratique", re.I), "Stage"),
        (re.compile(r"\bprestation|freelance|freelanc|mission|consultant| indépendant|contractor", re.I), "Prestation"),
        (re.compile(r"\balternance\b|apprentissage|work.study", re.I), "Alternance"),
    ]

    # Pattern villes ivoiriennes (remplit location si absente)
    CITY_PATTERN = re.compile(
        r"\b(Abidjan|Yamoussoukro|Bouaké|San[\s-]?Pedro|Daloa|Korhogo|Man|Gagnoa|Abobo|Cocody|Plateau|Treichville|Port[\s-]Bouët|Koumassi|Adjamé|Yopougon|Marcory|Anyama|Bingerville|Dimbokro|Katiola|Bondoukou|Abengourou|Soubré|Guiglo|Divo|Issia|Séguéla|Vavoua|Zuénoula)\b",
        re.UNICODE | re.IGNORECASE,
    )

    def __init__(self, session: requests.Session, request_delay: float = 1.2, user_agent: str = ""):
        self.s = session
        self.s.headers.update(
            {
                "User-Agent": user_agent
                or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 DjossiCI/1.0 (+https://djossi.ci; contact@djossi.ci)",
                "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
            }
        )
        self.request_delay = request_delay

    # ---------- HTTP helpers ------------------------------------------------
    def _get(self, url: str, timeout: int = 20) -> requests.Response | None:
        try:
            time.sleep(self.request_delay + random.uniform(0, 0.8))  # anti-ban
            resp = self.s.get(url, timeout=timeout, allow_redirects=True)
            resp.raise_for_status()
            return resp
        except (requests.RequestException, TimeoutError) as exc:
            print(f"    ⚠️  [{self.name}] GET {url} échoué : {exc}", file=sys.stderr)
            return None

    # ---------- API publique ------------------------------------------------
    def scrape(self, max_offers: int) -> list[RawOffer]:
        """Surcharger dans les sous-classes. Retourne les RawOffer scrapées."""
        raise NotImplementedError

    # ---------- Helpers de parsing normalisés -------------------------------
    def guess_contract(self, text: str) -> str:
        if not text:
            return "CDI"
        for rx, label in self.CONTRACT_PATTERNS:
            if rx.search(text):
                return label
        return "CDI"  # valeur la plus probable par défaut

    def guess_location(self, text: str) -> str:
        if not text:
            return "Abidjan"
        match = self.CITY_PATTERN.search(text)
        if match:
            city = match.group(1).replace("-", "-").replace("\u00c8", "È").replace("  ", " ").strip()
            if city.lower() in {"plateau", "cocody", "abobo", "treichville",
                                 "koumassi", "yopougon", "marcory", "port bouët",
                                 "adjamé", "anyama", "bingerville"}:
                return f"Abidjan - {city}"
            return city
        return "Abidjan"

    def clean_html(self, html: str | BeautifulSoup) -> str:
        """Convert HTML brut de la fiche de poste -> texte Markdown minimal + lisible."""
        # Cas 1 : c'est deja du Markdown / texte brut (mode demo ou site sans HTML)
        raw_text = html if isinstance(html, str) else html.get_text("\n", strip=True)
        # Si la chaine brute semble deja etre du Markdown (titres #, listes -, puces)
        # ou contient moins de 4 tags HTML, on passe en mode "texte brut" pour ne
        # pas perdre les titres Markdown deja la.
        if isinstance(html, str):
            tag_count = re.findall(r"<(/?\w+)", html)
            if len(tag_count) < 4:
                return self._clean_text_block(raw_text)

        soup = html if isinstance(html, BeautifulSoup) else BeautifulSoup(html, "lxml")
        # Retirer les scripts, styles, no-script
        for tag in soup.find_all(["script", "style", "noscript", "iframe"]):
            tag.decompose()
        lines: list[str] = []
        # Parcours en profondeur mais SANS duplicates : on ne traite un p/div QUE si
        # aucun enfant plus precis (h*, li, a) n'a deja ete capture.
        seen: set[int] = set()

        def visit(node) -> None:
            if isinstance(node, str):
                return
            if id(node) in seen:
                return
            name = getattr(node, "name", None)
            if not name:
                return
            seen.add(id(node))
            if name in {"br", "hr"}:
                if lines and lines[-1] != "":
                    lines.append("")
                return
            if name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
                text = node.get_text(" ", strip=True)
                if text:
                    lines.append("")
                    level = min(int(name[1]), 3)
                    lines.append(f"{'#' * level} {text}")
                    lines.append("")
                for c in node.children:
                    visit(c)
                return
            if name == "li":
                text = node.get_text(" ", strip=True)
                if text:
                    lines.append(f"- {text}")
                # ne pas revisiter les enfants sinon on double
                return
            if name == "a":
                text = node.get_text(" ", strip=True)
                href = node.get("href", "")
                if href and not href.startswith("#"):
                    lines.append(f"[{text}]({href})")
                elif text:
                    lines.append(text)
                return
            if name in {"p", "div", "section", "article", "td", "blockquote"}:
                # Traiter d'abord les enfants specifiques
                for c in node.children:
                    visit(c)
                # Si aucune ligne n'a ete ajoutee par les enfants, on prend le texte global
                # pour ne pas perdre le contenu texte brute.
                if not any(True for _ in []):
                    inline_text = node.get_text(" ", strip=True)
                    # Ne conserver que si aucun descendant "parlant" n'a deja ete ajoute
                    has_specific = False
                    for desc in node.descendants:
                        if not isinstance(desc, str) and getattr(desc, "name", None) in {"h1","h2","h3","h4","h5","h6","li","a"}:
                            has_specific = True
                            break
                    if inline_text and (not has_specific) and inline_text not in lines:
                        lines.append(inline_text)
                return
            # Autres tags : recurse
            for c in node.children:
                visit(c)

        visit(soup)
        # Fallback : si rien n'a ete extrait, prendre le texte brut
        if not any(l.strip() for l in lines):
            return self._clean_text_block(raw_text)
        # Nettoyer espaces + lignes vides consecutives
        cleaned: list[str] = []
        prev_empty = True
        for raw in lines:
            s = raw.strip()
            if not s:
                if not prev_empty:
                    cleaned.append("")
                prev_empty = True
            else:
                s = re.sub(r"[ \t]{2,}", " ", s)
                cleaned.append(s)
                prev_empty = False
        return "\n".join(cleaned).strip()

    @staticmethod
    def _clean_text_block(text: str) -> str:
        """Nettoyer un bloc texte / Markdown deja present (cas demo ou markdown natif)."""
        if not text:
            return ""
        # Normaliser retours chariot \r\n -> \n, tabulations
        text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", "  ")
        # Supprimer les espaces superflus en fin de chaque ligne
        text = "\n".join(ln.rstrip() for ln in text.split("\n"))
        # Ne conserver que 2 lignes vides maximum consecutives
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


# =============================================================================
# 1) DemoSiteScraper — HTML stub intégré : marche SANS INTERNET, pour tests
# =============================================================================
class DemoSiteScraper(BaseSiteScraper):
    """Scraper de démonstration — retourne 4 offres fictives réalistes."""
    name = "demo"
    base_url = "https://demo.djossi.local"
    search_paths = ["/"]

    def scrape(self, max_offers: int) -> list[RawOffer]:
        stub_offers = [
            {
                "title": "Développeur Frontend React / Next.js",
                "company": "Orange Digital Center Côte d'Ivoire",
                "location": "Abidjan - Cocody",
                "contract_type": "CDI",
                "description": (
                    "## Mission\n"
                    "Intégrez l'équipe Produit d'Orange Digital Center Côte d'Ivoire pour développer de nouvelles "
                    "plateformes digitales en Next.js destinées à 5M+ d'utilisateurs.\n\n"
                    "## Profil recherché\n"
                    "- 3+ ans d'expérience React, TypeScript, Next.js (App Router)\n"
                    "- Maîtrise de Tailwind CSS 4 et des Server Components\n"
                    "- Connaissance de GraphQL ou REST, tests Playwright\n"
                    "- Français courant, télétravail hybride accepté (3j/7 sur site Cocody)\n\n"
                    "## Avantages\n"
                    "Mutuelle, prime de rendement, formations certifiantes Orange.\n\n"
                    "Postuler directement : recrutement.odc@orange.ci"
                ),
                "source_url": "https://demo.djossi.local/orange-digital-center-dev-react",
                "apply_link": "https://orange.ci/recrutement/digital-center-frontend",
                "apply_email": None,
                "published_at": "2026-07-26T09:00:00",
            },
            {
                "title": "Ingénieur Commercial BTP",
                "company": "Société Ivoirienne de Bâtiment (SIB)",
                "location": "Bouaké",
                "contract_type": "CDD",
                "description": (
                    "### Contexte\n"
                    "La SIB recherche un(e) Ingénieur(e) Commercial(le) pour sa direction Grand Public sur le "
                    "pôle Bouaké, dans le cadre d'un CDD de 18 mois renouvelable.\n\n"
                    "### Missions\n"
                    "- Prospection commerciale sur les marchés de Bouaké et du Centre\n"
                    "- Négociation d'offres de prix et signature de contrats\n"
                    "- Suivi portefeuille clients BTP\n\n"
                    "### Profil\n"
                    "Bac+4/5 Commercial, École de commerce ou Ingénieur option commercial.\n"
                    "2+ années d'expérience vente B2B dans le bâtiment idéal.\n\n"
                    "Candidatures par email : jobs@sib.ci (objet : Candidature IC-BTP Bouaké)"
                ),
                "source_url": "https://demo.djossi.local/sib-ingenieur-commercial-btp-bouake",
                "apply_link": None,
                "apply_email": "jobs@sib.ci",
                "published_at": "2026-07-25T10:30:00",
            },
            {
                "title": "Stage Data Analyst Power BI (Bac+4/5)",
                "company": "Compagnie Ivoirienne d'Électricité (CIE)",
                "location": "Abidjan - Plateau",
                "contract_type": "Stage",
                "description": (
                    "## Stage 6 mois — Département Performance Industrielle\n"
                    "La CIE recherche un(e) stagiaire Data Analyst Bac+4/5 en statistique, informatique ou "
                    "mathématiques appliquées, pour automatiser les rapports du réseau électrique sous Power BI.\n\n"
                    "## Activités\n"
                    "- ETL depuis SQL Server / PostgreSQL → Power BI Dataflows\n"
                    "- Création de dashboards consommation, pannes, prévisions charge\n"
                    "- Automatisation sous Python (Pandas) des exports mensuels\n\n"
                    "## Profil\n"
                    "- M1/2 Ingénieur, MST ou équivalent\n"
                    "- Niveau avancé Power BI, bases solides SQL\n"
                    "- Notions Python appréciées\n"
                    "- Français impeccable\n\n"
                    "## Modalités\n"
                    "Début Septembre 2026 — Gratification + tickets restaurant + allocation transport\n"
                    "Postuler via https://cie.ci/stages/data-analyst-2026"
                ),
                "source_url": "https://demo.djossi.local/cie-stage-data-analyst",
                "apply_link": "https://cie.ci/stages/data-analyst-2026",
                "apply_email": None,
                "published_at": "2026-07-27T14:00:00",
            },
            {
                "title": "Responsable Marketing et Communication",
                "company": "Caféivoire Export SA",
                "location": "Yamoussoukro",
                "contract_type": "CDI",
                "description": (
                    "# Poste\n"
                    "Caféivoire Export SA, exportateur ivoirien de café-cacao certifié UTZ recherche son "
                    "nouveau Responsable Marketing & Communication, basé(e) à Yamoussoukro (dépendance Abidjan possible).\n\n"
                    "## Responsabilités\n"
                    "1. Définir la stratégie de marque et la déployer (AFRICA FOOD SHOW, SIAL, sites web)\n"
                    "2. Piloter les campagnes B2B et B2C sur LinkedIn, Meta, TikTok Business\n"
                    "3. Produire les contenus, catalogues produits et salons internationaux\n\n"
                    "## Profil\n"
                    "- Bac+5 Marketing (ESCAE, EAGC, UJLoG, Sup'INFO)\n"
                    "- 4+ ans en marketing B2B agroalimentaire souhaité\n"
                    "- Anglais professionnel requis\n"
                    "- Permis B\n\n"
                    "## Postuler\n"
                    "Envoyer CV + LM (objet: CAND-RESP-MKT-2026) à l'adresse careers@cafeivoire-export.ci"
                ),
                "source_url": "https://demo.djossi.local/cafeivoire-resp-marketing",
                "apply_link": None,
                "apply_email": "careers@cafeivoire-export.ci",
                "published_at": "2026-07-20T08:15:00",
            },
        ]
        results: list[RawOffer] = []
        for raw in stub_offers[:max_offers]:
            # Pour le demo, on repasse par la logique de "nettoyage" pour vérifier
            # que le pipeline (découpe email, dedup, validations) fonctionne.
            soup = BeautifulSoup(f"<body>{raw['description']}</body>", "lxml")
            clean_desc = self.clean_html(soup)
            offer = RawOffer(
                title=raw["title"],
                company=raw["company"],
                location=raw["location"],
                contract_type=raw["contract_type"],
                description=clean_desc,
                source_url=raw["source_url"],
                apply_link=raw.get("apply_link"),
                apply_email=raw.get("apply_email"),
                is_verified=False,
                published_at=raw.get("published_at"),
            )
            results.append(offer)
        print(f"  [{self.name}] Démo : {len(results)} offres générées")
        return results


# =============================================================================
# 2) Jobberman CI — Site réel (https://www.jobberman.ci/)
# =============================================================================
class JobbermanCIScraper(BaseSiteScraper):
    name = "jobberman"
    base_url = "https://www.jobberman.ci"
    search_paths = ["/emplois?page=1", "/emplois?page=2"]

    def scrape(self, max_offers: int) -> list[RawOffer]:
        collected: list[RawOffer] = []
        for search_path in self.search_paths:
            url = urljoin(self.base_url, search_path)
            print(f"  🕸  [{self.name}] listing → {url}")
            resp = self._get(url)
            if not resp:
                continue
            soup = BeautifulSoup(resp.text, "lxml")
            # Les card de listing sur Jobberman portent souvent la classe .search-result
            # On cible les liens contenant une offre (heuristique robuste si classes changent)
            links: list[str] = []
            for a in soup.select("a[href]"):
                href = a.get("href", "")
                full = urljoin(self.base_url, href)
                # Pattern typique : /job-detail-slug ou /post/ ou /emplois/<slug>
                if (
                    full.startswith(self.base_url)
                    and ("job" in full.lower() or "poste" in full.lower() or "emploi" in full.lower())
                    and full != self.base_url.rstrip("/")
                    and full not in links
                    and not full.endswith("/emplois")
                ):
                    links.append(full)
            # Dédoublonne + limite
            links = links[:max_offers - len(collected)]
            print(f"       → {len(links)} pages détail candidates")
            for detail_url in links:
                if len(collected) >= max_offers:
                    break
                offer = self._parse_detail(detail_url)
                if offer:
                    collected.append(offer)
            if len(collected) >= max_offers:
                break
        return collected

    def _parse_detail(self, detail_url: str) -> RawOffer | None:
        resp = self._get(detail_url, timeout=25)
        if not resp:
            return None
        soup = BeautifulSoup(resp.text, "lxml")
        # --- Titre ---
        title = ""
        for selector in ["h1", "[class*='job-title']", "[class*='JobHeader']", "h2"]:
            el = soup.select_one(selector)
            if el:
                title = el.get_text(" ", strip=True)
                if 4 < len(title) < 200:
                    break
        if not title:
            return None
        # --- Entreprise ---
        company = ""
        for sel in [
            "[class*='company']",
            "[class*='Company']",
            "[data-company]",
            "meta[property='og:site_name']",
        ]:
            el = soup.select_one(sel)
            if not el:
                continue
            if el.name == "meta":
                company = el.get("content", "") or ""
            else:
                company = el.get_text(" ", strip=True)
            if len(company) >= 2:
                break
        company = company or "Entreprise non précisée"
        # --- Bloc de texte principal ---
        desc_sel = [
            "[class*='description']",
            "[class*='job-body']",
            "[class*='job__content']",
            "article",
            "main",
        ]
        desc_html = None
        for s in desc_sel:
            tag = soup.select_one(s)
            if tag and len(tag.get_text(" ", strip=True)) > 200:
                desc_html = tag
                break
        if desc_html is None:
            desc_html = soup
        description = self.clean_html(desc_html)
        # --- Ville ---
        page_text = soup.get_text(" ", strip=True)[:4000]
        location = self.guess_location(page_text + " " + title)
        # --- Contrat ---
        contract = self.guess_contract(page_text + " " + title)
        # --- Apply link / email ---
        apply_link = None
        for a in soup.select("a[href]"):
            t = (a.get_text(" ", strip=True) or "").lower()
            h = (a.get("href", "") or "").lower()
            if (
                any(k in t for k in ("postuler", "candidater", "apply", "candidature", "envoyer"))
                or any(k in h for k in ("apply", "candidat", "recrut", "postuler"))
            ):
                apply_link = urljoin(self.base_url, a["href"])
                break
        if not apply_link:
            # Par défaut la page détail elle-même sert de source d'application
            apply_link = detail_url
        apply_email = None
        m = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", page_text)
        if m:
            apply_email = m.group(0)
        return RawOffer(
            title=title,
            company=company,
            location=location,
            contract_type=contract,
            description=description,
            source_url=detail_url,
            apply_link=apply_link,
            apply_email=apply_email,
            is_verified=False,
        )


# =============================================================================
# 3) Emploi.ci — Autre site réel d'offres ivoiriennes (exemple)
# =============================================================================
class EmploiCIScraper(BaseSiteScraper):
    name = "emploici"
    base_url = "https://www.emploi.ci"
    search_paths = ["/offres-d-emploi.html"]

    def scrape(self, max_offers: int) -> list[RawOffer]:
        results: list[RawOffer] = []
        for p in self.search_paths:
            url = urljoin(self.base_url, p)
            print(f"  🕸  [{self.name}] listing → {url}")
            resp = self._get(url)
            if not resp:
                continue
            soup = BeautifulSoup(resp.text, "lxml")
            links: list[str] = []
            for a in soup.select("a[href]"):
                href = a.get("href", "")
                full = urljoin(self.base_url, href)
                if (
                    full.startswith(self.base_url)
                    and ("offre" in full.lower() or "emploi" in full.lower() or "job" in full.lower())
                    and full != self.base_url.rstrip("/")
                    and ".html" in full
                    and full not in links
                ):
                    links.append(full)
            links = links[: max_offers - len(results)]
            print(f"       → {len(links)} pages détail candidates")
            for durl in links:
                if len(results) >= max_offers:
                    break
                offer = self._parse_detail(durl)
                if offer:
                    results.append(offer)
        return results

    def _parse_detail(self, detail_url: str) -> RawOffer | None:
        resp = self._get(detail_url)
        if not resp:
            return None
        soup = BeautifulSoup(resp.text, "lxml")
        h1 = soup.h1
        if not h1:
            return None
        title = h1.get_text(" ", strip=True)
        if len(title) < 4:
            return None
        page = soup.get_text(" ", strip=True)
        desc_container = soup.select_one("article, .field-body, main, .content")
        description = self.clean_html(desc_container or soup)
        # Entreprise : on prend souvent un sous-titre
        company = "Entreprise non précisée"
        for cls in ["company", "recruteur", "entreprise", "employer", "logo-title"]:
            el = soup.select_one(f"[class*='{cls}']")
            if el and len(t := el.get_text(" ", strip=True)) >= 2:
                company = t
                break
        return RawOffer(
            title=title,
            company=company,
            location=self.guess_location(page),
            contract_type=self.guess_contract(page),
            description=description,
            source_url=detail_url,
            apply_link=detail_url,
            apply_email=next(iter(re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", page)), None),
            is_verified=False,
        )


# ---------- Enregistrement de tous les sites --------------------------------
SITE_REGISTRY["demo"] = DemoSiteScraper
SITE_REGISTRY["jobberman"] = JobbermanCIScraper
SITE_REGISTRY["emploici"] = EmploiCIScraper


# =============================================================================
# Stockage SQLite — miroir du schéma Supabase job_offers (data/djossi-ci.sqlite3)
# =============================================================================
class JobOfferStore:
    CONTRACT_TYPES = {"CDI", "CDD", "Stage", "Prestation", "Alternance", "Freelance"}

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn: sqlite3.Connection | None = None

    def __enter__(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, timeout=30, isolation_level=None)
        # Multi-process safe (WAL) + contraintes CHECK / FK activées
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self.conn.execute("PRAGMA synchronous=NORMAL;")
        self.conn.execute("PRAGMA foreign_keys=ON;")
        self._ensure_schema()
        return self

    def __exit__(self, exc_type, exc, tb):
        if self.conn:
            try:
                self.conn.commit()
            finally:
                self.conn.close()
                self.conn = None

    # ---------- Schéma (créé automatiquement si absent) --------------------
    def _ensure_schema(self) -> None:
        assert self.conn is not None
        self.conn.executescript(
            """
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
              is_verified     INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0,1)),
              created_at      TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
              CONSTRAINT valid_contract_type CHECK (contract_type IN ('CDI','CDD','Stage','Prestation','Alternance','Freelance')),
              CONSTRAINT valid_apply_method CHECK (apply_link IS NOT NULL OR apply_email IS NOT NULL),
              CONSTRAINT unique_title_company UNIQUE (title, company, source_url)
            );

            CREATE INDEX IF NOT EXISTS idx_jobs_location    ON job_offers (location);
            CREATE INDEX IF NOT EXISTS idx_jobs_contract    ON job_offers (contract_type);
            CREATE INDEX IF NOT EXISTS idx_jobs_created_at  ON job_offers (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_jobs_verified    ON job_offers (is_verified DESC, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_jobs_dedup_slug  ON job_offers (source_url);

            CREATE TRIGGER IF NOT EXISTS trigger_jobs_set_updated_at
            AFTER UPDATE ON job_offers
            FOR EACH ROW
            BEGIN
              UPDATE job_offers SET updated_at = datetime('now') WHERE rowid = NEW.rowid;
            END;
            """
        )

    # ---------- Idempotent insert ------------------------------------------
    def upsert(self, offer: RawOffer) -> tuple[str, bool]:
        """
        Insere une offre.
        - Si l'offre existe deja (dedup : source_url OU slug(title+company+location)
          ET source_url absent) : on fait un UPDATE.
        - Retourne (id, was_created).
        - Garantit la CHECK valid_apply_method via fallback sur source_url si besoin.
        """
        assert self.conn is not None
        # Normalisation finale avant insertion
        if offer.contract_type not in self.CONTRACT_TYPES:
            offer.contract_type = "CDI"
        if not offer.apply_link and not offer.apply_email:
            offer.apply_link = offer.source_url
        now = datetime.now().replace(microsecond=0).isoformat()
        cur = self.conn.cursor()

        row_id: str | None = None
        # --- 1. Recherche de doublon existant ---
        if offer.source_url:
            cur.execute(
                """
                SELECT id FROM job_offers
                WHERE source_url = ?
                   OR (title = ? AND company = ? AND (source_url IS NULL OR source_url = ''))
                LIMIT 1
                """,
                (offer.source_url, offer.title, offer.company),
            )
            r = cur.fetchone()
            if r:
                row_id = r[0]
        else:
            cur.execute(
                "SELECT id FROM job_offers WHERE title = ? AND company = ? AND location = ? LIMIT 1",
                (offer.title, offer.company, offer.location),
            )
            r = cur.fetchone()
            if r:
                row_id = r[0]

        # --- 2. Mise a jour si trouvé ---
        if row_id is not None:
            cur.execute(
                """
                UPDATE job_offers SET
                    contract_type = ?,
                    location = ?,
                    description = ?,
                    apply_link  = COALESCE(?, apply_link),
                    apply_email = COALESCE(?, apply_email),
                    source_url  = COALESCE(?, source_url),
                    is_verified = CASE WHEN is_verified=1 THEN 1 ELSE ? END,
                    updated_at  = ?
                WHERE id = ?
                """,
                (
                    offer.contract_type,
                    offer.location,
                    offer.description.strip(),
                    offer.apply_link,
                    offer.apply_email,
                    offer.source_url,
                    1 if offer.is_verified else 0,
                    now,
                    row_id,
                ),
            )
            return row_id, False

        # --- 3. Sinon INSERT classique (génération UUID v4 SQL) ---
        cur.execute(
            """
            INSERT INTO job_offers
                (title, company, location, contract_type, description,
                 apply_link, apply_email, source_url, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """,
            (
                offer.title.strip(),
                offer.company.strip(),
                offer.location.strip(),
                offer.contract_type,
                offer.description.strip(),
                offer.apply_link,
                offer.apply_email,
                offer.source_url,
                1 if offer.is_verified else 0,
                now,
                now,
            ),
        )
        r = cur.fetchone()
        if r:
            return r[0], True
        # Fallback si RETURNING indisponible (< SQLite 3.35)
        cur.execute("SELECT last_insert_rowid()")
        rid = cur.fetchone()
        if not rid:
            return "", False
        cur.execute("SELECT id FROM job_offers WHERE rowid = ?", (rid[0],))
        r = cur.fetchone()
        return (r[0], True) if r else ("", False)

    def stats(self) -> dict:
        assert self.conn is not None
        cur = self.conn.execute(
            """
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN is_verified=1 THEN 1 ELSE 0 END) AS verified
            FROM job_offers;
            """
        )
        total, verified = cur.fetchone() or (0, 0)
        cur.execute(
            "SELECT contract_type, COUNT(*) FROM job_offers GROUP BY contract_type;"
        )
        by_type = dict(cur.fetchall() or [])
        return {"total": total or 0, "verified": verified or 0, "by_contract": by_type}


# =============================================================================
# Pipeline principal
# =============================================================================
def run_pipeline(args: argparse.Namespace) -> int:
    notifier = JobWhatsAppNotifier.from_env(disabled=args.no_notify)

    # 1) Session HTTP ---------------------------------------------------------
    if HAS_CACHE and not args.no_cache:
        session = requests_cache.CachedSession(
            str(CACHE_PATH.with_suffix("")),
            expire_after=3600,
            allowable_codes=(200, 201, 404),
        )
        print(f"💾 Cache HTTP activé dans : {CACHE_PATH}")
    else:
        session = requests.Session()

    # 2) Choisir les scrapers -------------------------------------------------
    if args.demo:
        site_names = ["demo"]
    else:
        site_names = [s.strip().lower() for s in (args.sites or "demo").split(",") if s.strip()]
        if not site_names:
            site_names = ["demo"]

    print(f"\n🗂  Scrapers sélectionnés : {', '.join(site_names)}")
    print(f"🎯 Max offres à collecter : {args.max_per_site} par site ({len(site_names)} sites = max {args.max_per_site*len(site_names)} total)\n")

    # 3) Scrape --------------------------------------------------------------
    all_offers: dict[str, RawOffer] = {}
    for name in site_names:
        cls = SITE_REGISTRY.get(name)
        if not cls:
            print(f"❌ Scraper '{name}' inconnu. Disponibles : {list(SITE_REGISTRY)}")
            continue
        print(f"▶ [{name}] Démarrage…")
        scraper = cls(session=session, request_delay=0 if args.demo else args.delay)
        try:
            offers = scraper.scrape(max_offers=args.max_per_site)
        except Exception as exc:
            print(f"  ❌ [{name}] échec : {exc!r}", file=sys.stderr)
            continue
        valid = 0
        for o in offers:
            ok, reason = o.is_valid()
            if not ok:
                print(f"    ⏭  skip «{o.title[:40]}…» : {reason}")
                continue
            # Déduplication mémoire inter-sites
            key = o.dedup_key()
            if key in all_offers:
                continue
            all_offers[key] = o
            valid += 1
        print(f"  ✔ [{name}] {valid} offres valides / {len(offers)} brutes")

    print(f"\n🧹 Total après dédoublonnage mémoire : {len(all_offers)} offres")

    # 4) Export JSON (pour audit) -------------------------------------------
    offers_list = sorted(
        all_offers.values(), key=lambda o: (o.company.lower(), o.title.lower())
    )
    if args.output:
        out_path = Path(args.output).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            json.dump([asdict(o) for o in offers_list], f, ensure_ascii=False, indent=2)
        print(f"📄 Export JSON : {out_path}")

    if args.dry_run:
        print("\n🧪 Mode --dry-run : PAS D'INSERTION EN BDD.")
        for i, o in enumerate(offers_list[:5], 1):
            print(f"   {i:>2}. [{o.contract_type:<10}] {o.company} · {o.title} ({o.location})")
        if len(offers_list) > 5:
            print(f"       …et {len(offers_list) - 5} autres.")
        return 0

    # 5) Insertion en BDD ----------------------------------------------------
    created = 0
    updated = 0
    notifications_sent = 0
    notification_errors: list[str] = []
    ids: list[str] = []
    with JobOfferStore(DB_PATH) as store:
        for o in offers_list:
            offer_id, was_created = store.upsert(o)
            if not offer_id:
                continue
            ids.append(offer_id)
            if was_created:
                created += 1
                result = notifier.send_new_job(offer_id, o)
                if notifier.enabled and result.sent:
                    notifications_sent += 1
                elif notifier.enabled and not result.sent:
                    notification_errors.append(f"{o.title[:60]} ({result.detail})")
            else:
                updated += 1
        stats = store.stats()

    print(f"\n✅ Insertion terminée dans : {DB_PATH}")
    print(f"   · Nouvelles :   {created:>4}")
    print(f"   · Mises à jour: {updated:>4}")
    if notifier.enabled:
        print(f"   · WhatsApp :    {notifications_sent:>4}")
        if notification_errors:
            print(f"   · Erreurs WA :  {len(notification_errors):>4}")
            for err in notification_errors[:3]:
                print(f"      - {err}")
            if len(notification_errors) > 3:
                print(f"      - …et {len(notification_errors) - 3} autres.")
    else:
        print(f"   · WhatsApp :    désactivé ({notifier.reason})")
    print(f"\n📊 Statistiques table job_offers :")
    print(f"   · Total : {stats['total']}")
    print(f"   · Vérifiées : {stats['verified']}")
    if stats["by_contract"]:
        print("   · Par type de contrat :")
        for typ, n in sorted(stats["by_contract"].items(), key=lambda x: -x[1]):
            print(f"      - {typ:<12} {n:>4}")
    return 0


# =============================================================================
# CLI
# =============================================================================
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="scraper.py",
        description="Scrape les offres d'emploi de sites ivoiriens → BDD Djossi.ci",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--demo", action="store_true",
                   help="Mode démo : utilise 4 offres embarquées (sans internet). Implique --sites=demo.")
    p.add_argument("--sites", type=str, default="jobberman,emploici",
                   help=f"Sites à scraper, séparés par virgule (défaut: jobberman,emploici). Disponibles : {list(SITE_REGISTRY)}")
    p.add_argument("--max-per-site", type=int, default=10,
                   help="Max d'offres par site (défaut: 10).")
    p.add_argument("--delay", type=float, default=1.4,
                   help="Délai moyen entre 2 requêtes HTTP (anti-ban, défaut: 1.4s).")
    p.add_argument("--no-cache", action="store_true",
                   help="Désactive requests-cache (si installé).")
    p.add_argument("--dry-run", action="store_true",
                   help="Ne pas toucher à la BDD. Affiche et (optionnel) export JSON.")
    p.add_argument("--output", type=str, default=None,
                   help="Chemin du JSON d'export (ex: ../data/scraped.json).")
    p.add_argument("--no-notify", action="store_true",
                   help="Désactive l'envoi webhook/WhatsApp même si les variables d'environnement sont configurées.")
    return p


if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()
    print("=" * 72)
    print(" Djossi.ci — scraper.py · moteurs d'offres ivoiriens")
    print("=" * 72)
    try:
        code = run_pipeline(args)
    except KeyboardInterrupt:
        print("\n⏹  Interrompu par l'utilisateur.")
        code = 130
    sys.exit(code)
