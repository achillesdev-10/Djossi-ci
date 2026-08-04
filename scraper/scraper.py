#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/scraper.py
  Runner principal du moteur de scraping multi-sources pour la Côte d'Ivoire
===============================================================================
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Type

# Fix console encoding for Windows
def _fix_console() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace") # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace") # type: ignore[attr-defined]
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)

_fix_console()

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "djossi-ci.sqlite3"

# Permet l'exécution directe `python scraper/scraper.py` (le CWD n'étant pas
# automatiquement dans sys.path, le package `scraper` ne serait pas résolu).
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scraper.core.logger import setup_logger
from scraper.core.http_client import HttpClient
from scraper.core.duplicate_detector import DuplicateDetector
from scraper.core.cleaner import clean_job
from scraper.core.base_scraper import BaseScraper
from scraper.core.scheduler import JobScheduler
from scraper.models.job import Job
from scraper.database.repository import JobRepository

# Import Job Site Scrapers
from scraper.scrapers.educarriere import EducarriereScraper
from scraper.scrapers.emploi_ci import EmploiCiScraper
from scraper.scrapers.emploiivoire import EmploiIvoireScraper
from scraper.scrapers.jobivoire import JobIvoireScraper
from scraper.scrapers.jobivoire2 import JobIvoire2Scraper
from scraper.scrapers.novojob import NovojobScraper
from scraper.scrapers.rmo import RmoScraper
from scraper.scrapers.tectra import TectraScraper
from scraper.scrapers.agence_emploi_jeunes import AgenceEmploiJeunesScraper

# Import Company Scrapers
from scraper.scrapers.companies.orange import OrangeScraper
from scraper.scrapers.companies.mtn import MtnScraper
from scraper.scrapers.companies.nsia import NsiaScraper
from scraper.scrapers.companies.ecobank import EcobankScraper
from scraper.scrapers.companies.sgci import SgciScraper
from scraper.scrapers.companies.sifca import SifcaScraper
from scraper.scrapers.companies.cie import CieScraper
from scraper.scrapers.companies.sodeci import SodeciScraper
from scraper.scrapers.companies.pfo import PfoScraper

logger = setup_logger("djossi_runner")

SCRAPER_REGISTRY: Dict[str, Type[BaseScraper]] = {
    "educarriere": EducarriereScraper,
    "emploici": EmploiCiScraper,
    "emploiivoire": EmploiIvoireScraper,
    "jobivoire": JobIvoireScraper,
    "jobivoire2": JobIvoire2Scraper,
    "novojob": NovojobScraper,
    "rmo": RmoScraper,
    "tectra": TectraScraper,
    "agence_emploi_jeunes": AgenceEmploiJeunesScraper,
    "orange": OrangeScraper,
    "mtn": MtnScraper,
    "nsia": NsiaScraper,
    "ecobank": EcobankScraper,
    "sgci": SgciScraper,
    "sifca": SifcaScraper,
    "cie": CieScraper,
    "sodeci": SodeciScraper,
    "pfo": PfoScraper,
}


def run_scraping_pipeline(site_names: List[str], max_per_site: int, dry_run: bool) -> int:
    logger.info("=" * 60)
    logger.info("🚀 Démarrage du pipeline de scraping Djossi.ci")
    logger.info(f"   Sites cibles : {site_names}")
    logger.info(f"   Max par site : {max_per_site}")
    logger.info(f"   Mode Dry-Run : {dry_run}")
    logger.info("=" * 60)

    # Journal d'exécution visible depuis le dashboard admin (scraper_logs)
    run_log_id = None
    if not dry_run:
        try:
            with JobRepository(DB_PATH) as repo:
                run_log_id = repo.add_scraper_log(
                    "running", 0, f"Scraping lancé : {', '.join(site_names)} (max {max_per_site}/site)"
                )
        except Exception as exc:
            logger.warning(f"Impossible d'écrire le log de démarrage : {exc}")

    http_client = HttpClient()
    dup_detector = DuplicateDetector()
    all_jobs: List[Job] = []

    for name in site_names:
        scraper_class = SCRAPER_REGISTRY.get(name)
        if not scraper_class:
            logger.error(f"❌ Scraper '{name}' inconnu. Disponibles : {list(SCRAPER_REGISTRY.keys())}")
            continue

        logger.info(f"▶ Lancement du scraper : {name}")
        try:
            scraper = scraper_class(http_client)
            jobs = scraper.scrape(max_offers=max_per_site)
            logger.info(f"  ✓ [{name}] {len(jobs)} offres brutes collectées.")

            for job in jobs:
                # 1. Nettoyage & structuration de la description (retire le
                #    header/footer de la page source, structure en Markdown).
                #    → les offres stockées sont propres AVANT d'être validées.
                try:
                    clean_job(job)
                except Exception as exc:
                    logger.warning(f"  ⚠ Nettoyage impossible pour {job.title}: {exc}")

                # 2. Validation ivoirienne
                ok, reason = job.is_valid_ivorian()
                if not ok:
                    logger.debug(f"  🚫 Offre rejetée ({reason}): {job.title} @ {job.company}")
                    continue

                # 3. Détection doublons
                if dup_detector.is_duplicate(job):
                    logger.debug(f"  🔁 Doublon détecté : {job.title}")
                    continue

                # 4. Slug & SEO par défaut si absent
                if not job.slug:
                    from slugify import slugify
                    job.slug = slugify(f"{job.title}-{job.company}-{job.city}", separator="-")
                if not job.seo_title:
                    job.seo_title = f"{job.title} chez {job.company} - Emploi Côte d'Ivoire"
                if not job.seo_description:
                    job.seo_description = f"Découvrez l'offre d'emploi {job.title} à {job.location} sur Djossi.ci."

                all_jobs.append(job)
        except Exception as exc:
            logger.error(f"  ❌ Erreur critique sur le scraper {name}: {exc}", exc_info=True)

    http_client.close()

    logger.info(f"\n📊 Bilan collecte : {len(all_jobs)} offres valides uniques prêtes à l'enregistrement.")

    if dry_run:
        for idx, job in enumerate(all_jobs, 1):
            print(f"  {idx}. [{job.contract_type}] {job.title} — {job.company} ({job.location}) [Source: {job.source}]")
        return 0

    # Sauvegarde BDD SQLite (admin dashboard integration)
    created_count = 0
    updated_count = 0
    try:
        with JobRepository(DB_PATH) as repo:
            for job in all_jobs:
                _, was_created = repo.upsert(job)
                if was_created:
                    created_count += 1
                else:
                    updated_count += 1
            st = repo.stats()
    except Exception as exc:
        logger.error(f"❌ Erreur d'enregistrement en BDD : {exc}", exc_info=True)
        if run_log_id is not None:
            try:
                with JobRepository(DB_PATH) as repo:
                    repo.finish_scraper_log(run_log_id, "error", created_count, f"Erreur BDD : {exc}")
            except Exception:
                pass
        return 1

    logger.info(f"✅ Enregistrement BDD terminé !")
    logger.info(f"   Nouvelles offres (pending) : {created_count}")
    logger.info(f"   Offres mises à jour        : {updated_count}")
    logger.info(f"   Statistiques BDD globale   : Total={st['total']}, En attente={st['pending']}, Publiées={st['published']}")

    if run_log_id is not None:
        try:
            with JobRepository(DB_PATH) as repo:
                repo.finish_scraper_log(
                    run_log_id,
                    "success",
                    created_count,
                    f"Scraping terminé : {created_count} nouvelle(s) offre(s), {updated_count} mise(s) à jour."
                )
        except Exception as exc:
            logger.warning(f"Impossible de finaliser le log : {exc}")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Djossi.ci Scraper Engine - Côte d'Ivoire")
    parser.add_argument(
        "--sites",
        type=str,
        default="educarriere,emploici,orange,mtn",
        help="Liste des scrapers séparés par des virgules (ex: educarriere,emploici,orange,mtn ou 'all')"
    )
    parser.add_argument("--max-per-site", type=int, default=10, help="Nombre max d'offres par site")
    parser.add_argument("--dry-run", action="store_true", help="Afficher sans sauvegarder en BDD")
    parser.add_argument("--schedule", type=str, choices=["hourly", "6h", "daily"], help="Lancer via le scheduler")
    args = parser.parse_args()

    sites = [s.strip().lower() for s in args.sites.split(",") if s.strip()]
    if "all" in sites:
        sites = list(SCRAPER_REGISTRY.keys())

    target_func = lambda: run_scraping_pipeline(sites, args.max_per_site, args.dry_run)

    if args.schedule:
        scheduler = JobScheduler(target_func)
        if args.schedule == "hourly":
            scheduler.schedule_hourly()
        elif args.schedule == "6h":
            scheduler.schedule_every_6_hours()
        elif args.schedule == "daily":
            scheduler.schedule_daily()
        scheduler.start()
    else:
        sys.exit(target_func())


if __name__ == "__main__":
    main()
