#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/database/repository.py
  Repository de stockage et synchronisation BDD (SQLite / SQLAlchemy compatible)
===============================================================================
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from scraper.models.job import Job

# Supabase (optionnel) : si `supabase` n'est pas installé ou si les clés ne
# sont pas fournies, le repository continue de fonctionner en SQLite seul.
try:
    from supabase import create_client, Client as SupabaseClient
except ImportError:  # pragma: no cover
    SupabaseClient = None  # type: ignore


def _log_warning(message: str) -> None:
    try:
        import logging
        logging.getLogger("scraper.repository").warning(message)
    except Exception:
        print(f"[repository] {message}")


class JobRepository:
    def __init__(
        self,
        db_path: Path,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
    ):
        self.db_path = db_path
        self.conn: sqlite3.Connection | None = None

        # Miroir Supabase (production) : le workflow GitHub Actions fournit
        # déjà SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en variables d'env.
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.supabase: Optional[SupabaseClient] = None
        if SupabaseClient is not None and self.supabase_url and self.supabase_key:
            self.supabase = create_client(self.supabase_url, self.supabase_key)

    def __enter__(self) -> JobRepository:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.db_path), timeout=30)
        self.conn.row_factory = sqlite3.Row
        self._ensure_schema()
        self._migrate_schema()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
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
              deadline        TEXT,
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
              clicks_count    INTEGER NOT NULL DEFAULT 0,
              created_at      TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
              CONSTRAINT valid_contract_type CHECK (contract_type IN ('CDI','CDD','Stage','Prestation','Alternance','Freelance')),
              CONSTRAINT valid_status CHECK (status IN ('pending','published','rejected','archived')),
              CONSTRAINT valid_apply_method CHECK (apply_link IS NOT NULL OR apply_email IS NOT NULL),
              CONSTRAINT unique_title_company UNIQUE (title, company)
            );

            CREATE TABLE IF NOT EXISTS scraper_logs (
              id              INTEGER PRIMARY KEY AUTOINCREMENT,
              status          TEXT NOT NULL,
              offers_added    INTEGER NOT NULL DEFAULT 0,
              message         TEXT,
              started_at      TEXT NOT NULL DEFAULT (datetime('now')),
              finished_at     TEXT
            );
        """)

    def _migrate_schema(self) -> None:
        """Migration idempotente : ajoute les colonnes manquantes sur les bases
        créées par une version antérieure (ex. `deadline`)."""
        assert self.conn is not None
        cols = {row["name"] for row in self.conn.execute("PRAGMA table_info(job_offers)")}
        if "deadline" not in cols:
            self.conn.execute("ALTER TABLE job_offers ADD COLUMN deadline TEXT")
            self.conn.commit()

    def add_scraper_log(self, status: str, offers_added: int, message: str) -> int:
        assert self.conn is not None
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO scraper_logs (status, offers_added, message) VALUES (?, ?, ?) RETURNING id",
            (status, offers_added, message)
        )
        res = cur.fetchone()
        # Commit effectué par le gestionnaire de contexte (__exit__).
        log_id = int(res["id"]) if res else 0

        # Miroir Supabase (ne doit jamais faire échouer le pipeline SQLite).
        self._supabase_insert_log(status, offers_added, message)
        return log_id

    def _supabase_insert_log(self, status: str, offers_added: int, message: str) -> None:
        if self.supabase is None:
            return
        try:
            self.supabase.table("scraper_logs").insert({
                "status": status,
                "offers_added": int(offers_added),
                "message": message,
            }).execute()
        except Exception as exc:
            _log_warning(f"Échec de l'insertion du log Supabase : {exc}")

    def finish_scraper_log(self, log_id: int, status: str, offers_added: int, message: str) -> None:
        assert self.conn is not None
        self.conn.execute(
            "UPDATE scraper_logs SET status = ?, offers_added = ?, message = ?, finished_at = datetime('now') WHERE id = ?",
            (status, offers_added, message, log_id)
        )

        # Miroir Supabase : ferme la ligne « running » la plus récente
        # (il n'y a en pratique qu'un seul run en cours à la fois).
        if self.supabase is not None:
            try:
                data = (
                    self.supabase.table("scraper_logs")
                    .select("id")
                    .eq("status", "running")
                    .order("started_at", desc=True)
                    .limit(1)
                    .execute()
                )
                rows = data.data or []
                if rows:
                    self.supabase.table("scraper_logs").update({
                        "status": status,
                        "offers_added": int(offers_added),
                        "message": message,
                        "finished_at": datetime.utcnow().isoformat(),
                    }).eq("id", rows[0]["id"]).execute()
            except Exception as exc:
                _log_warning(f"Échec de la finalisation du log Supabase : {exc}")

    def upsert(self, job: Job) -> tuple[str, bool]:
        """Insère ou met à jour une offre. Retourne (id, was_created)."""
        assert self.conn is not None
        cur = self.conn.cursor()

        # Recherche par source_url ou combinaison (title + company)
        cur.execute(
            "SELECT id FROM job_offers WHERE source_url = ? OR (title = ? AND company = ?) LIMIT 1",
            (job.source_url, job.title, job.company)
        )
        row = cur.fetchone()
        now = datetime.now().isoformat()

        # L'offre doit TOUJOURS proposer un moyen de postuler (contrainte
        # `valid_apply_method`) : on retombe sur la source si aucun n'est fourni.
        apply_link = job.application_url or (job.source_url if not job.application_email else None)
        apply_email = job.application_email

        if row:
            job_id = row["id"]
            # Ne jamais rétrograder une offre déjà publiée / rejetée / archivée :
            # un re-scrape ne doit pas remettre à 'pending' un statut de modération.
            cur.execute("SELECT status, is_expired FROM job_offers WHERE id = ?", (job_id,))
            current = cur.fetchone()
            current_status = current["status"] if current else "pending"
            current_expired = bool(current["is_expired"]) if current else False

            # Exception à la règle ci-dessus : une offre AUTO-EXPIRÉE (is_expired=1)
            # retrouvée en ligne avec une date limite future est réactivée — le site
            # source a prolongé l'annonce, l'expiration n'a plus lieu d'être.
            if current_expired and job.deadline and job.deadline > datetime.now():
                target_status = "pending"
                is_expired_val = 0
            else:
                target_status = job.status if current_status in ("pending",) else current_status
                is_expired_val = 0 if not current_expired else 1

            cur.execute("""
                UPDATE job_offers 
                SET contract_type = ?, location = ?, description = ?, source_website = ?, 
                    status = ?, seo_title = ?, seo_description = ?, seo_keywords = ?, slug = ?, 
                    apply_link = ?, apply_email = ?, deadline = ?, is_expired = ?, updated_at = ?
                WHERE id = ?
            """, (
                job.contract_type, job.location, job.description, job.source,
                target_status, job.seo_title, job.seo_description, job.seo_keywords, job.slug,
                apply_link, apply_email, job.deadline.isoformat() if job.deadline else None,
                is_expired_val, now, job_id
            ))
            self.conn.commit()
            # Miroir Supabase (ne doit jamais faire échouer le pipeline SQLite).
            self._supabase_upsert(job, apply_link, apply_email, target_status, is_expired_val)
            return job_id, False

        # Insertion nouvelle offre
        cur.execute("""
            INSERT INTO job_offers (
                title, company, location, contract_type, description, apply_link, apply_email,
                deadline, source_url, source_website, status, seo_title, seo_description, seo_keywords,
                slug, is_verified, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            RETURNING id
        """, (
            job.title, job.company, job.location, job.contract_type, job.description,
            apply_link, apply_email, job.deadline.isoformat() if job.deadline else None,
            job.source_url, job.source,
            job.status, job.seo_title, job.seo_description, job.seo_keywords,
            job.slug, now, now
        ))
        res = cur.fetchone()
        self.conn.commit()
        if res:
            # Miroir Supabase (ne doit jamais faire échouer le pipeline SQLite).
            self._supabase_upsert(job, apply_link, apply_email, job.status)
            return res["id"], True
        return "", False

    def _supabase_upsert(self, job: Job, apply_link: Any, apply_email: Any, target_status: str, is_expired: int = 0) -> None:
        """
        Miroir Supabase de `upsert` : insère ou met à jour l'offre dans
        public.job_offers en reproduisant la déduplication SQLite
        (source_url OU combinaison titre + entreprise).
        """
        if self.supabase is None:
            return
        try:
            table = self.supabase.table("job_offers")

            # 1. Recherche d'une offre existante (source_url d'abord, puis titre+entreprise)
            existing: Dict[str, Any] | None = None
            if job.source_url:
                resp = table.select("id,status,is_expired").eq("source_url", job.source_url).maybe_single().execute()
                existing = resp.data
            if existing is None and job.title and job.company:
                resp = (
                    table.select("id,status,is_expired")
                    .eq("title", job.title)
                    .eq("company", job.company)
                    .limit(1)
                    .execute()
                )
                rows = resp.data or []
                if rows:
                    existing = rows[0]

            # Même logique de réactivation que SQLite : une offre auto-expirée
            # retrouvée avec une deadline future repasse en 'pending'.
            if existing and existing.get("is_expired") and job.deadline and job.deadline > datetime.now():
                target_status = "pending"
                is_expired = 0

            payload = {
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "contract_type": job.contract_type,
                "description": job.description,
                "apply_link": apply_link,
                "apply_email": apply_email,
                "deadline": job.deadline.isoformat() if job.deadline else None,
                "source_url": job.source_url,
                "source_website": job.source,
                "status": target_status,
                "is_expired": is_expired,
                "seo_title": job.seo_title,
                "seo_description": job.seo_description,
                "seo_keywords": job.seo_keywords,
                "slug": job.slug,
            }

            if existing:
                table.update(payload).eq("id", existing["id"]).execute()
            else:
                table.insert(payload).execute()
        except Exception as exc:
            _log_warning(f"Échec de l'upsert Supabase : {exc}")

    def purge_demo_offers(self) -> int:
        """Supprime les anciennes offres « démo » (source_url factice) de la BDD."""
        assert self.conn is not None
        cur = self.conn.execute(
            "DELETE FROM job_offers WHERE source_url LIKE '%demo%'"
        )
        deleted = cur.rowcount
        self.conn.commit()
        return deleted

    def expire_overdue_offers(self) -> int:
        """Expiration automatique : passe en `is_expired=1` + `status='archived'`
        les offres (pending/published) dont la date limite est dépassée."""
        assert self.conn is not None
        now = datetime.now().isoformat()
        cur = self.conn.execute(
            "UPDATE job_offers SET is_expired = 1, status = 'archived', updated_at = ? "
            "WHERE deadline IS NOT NULL AND deadline < ? AND status IN ('pending','published')",
            (now, now)
        )
        self.conn.commit()
        return cur.rowcount

    def mark_stale_as_expired(self, active_source_urls: list[str], source_name: str) -> int:
        """Marque comme expirées/archivées les offres de cette source qui n'ont pas été revues."""
        assert self.conn is not None
        cur = self.conn.cursor()
        # Non implémenté de façon agressive pour éviter les faux positifs en dry-run
        return 0

    def stats(self) -> Dict[str, int]:
        assert self.conn is not None
        cur = self.conn.execute("SELECT COUNT(*), SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END), SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) FROM job_offers;")
        tot, pen, pub = cur.fetchone() or (0, 0, 0)
        return {"total": tot or 0, "pending": pen or 0, "published": pub or 0}
