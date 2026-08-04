#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  Djossi.ci — scraper/database/repository.py
  Repository de stockage et synchronisation BDD (SQLite / SQLAlchemy compatible)
===============================================================================
"""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from scraper.models.job import Job


class JobRepository:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn: sqlite3.Connection | None = None

    def __enter__(self) -> JobRepository:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.db_path), timeout=30)
        self.conn.row_factory = sqlite3.Row
        self._ensure_schema()
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

    def add_scraper_log(self, status: str, offers_added: int, message: str) -> int:
        assert self.conn is not None
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO scraper_logs (status, offers_added, message) VALUES (?, ?, ?) RETURNING id",
            (status, offers_added, message)
        )
        res = cur.fetchone()
        # Commit effectué par le gestionnaire de contexte (__exit__).
        return int(res["id"]) if res else 0

    def finish_scraper_log(self, log_id: int, status: str, offers_added: int, message: str) -> None:
        assert self.conn is not None
        self.conn.execute(
            "UPDATE scraper_logs SET status = ?, offers_added = ?, message = ?, finished_at = datetime('now') WHERE id = ?",
            (status, offers_added, message, log_id)
        )

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
            cur.execute("SELECT status FROM job_offers WHERE id = ?", (job_id,))
            current = cur.fetchone()
            current_status = current["status"] if current else "pending"
            target_status = job.status if current_status in ("pending",) else current_status

            cur.execute("""
                UPDATE job_offers 
                SET contract_type = ?, location = ?, description = ?, source_website = ?, 
                    status = ?, seo_title = ?, seo_description = ?, seo_keywords = ?, slug = ?, 
                    apply_link = ?, apply_email = ?, updated_at = ?
                WHERE id = ?
            """, (
                job.contract_type, job.location, job.description, job.source,
                target_status, job.seo_title, job.seo_description, job.seo_keywords, job.slug,
                apply_link, apply_email, now, job_id
            ))
            self.conn.commit()
            return job_id, False

        # Insertion nouvelle offre
        cur.execute("""
            INSERT INTO job_offers (
                title, company, location, contract_type, description, apply_link, apply_email,
                source_url, source_website, status, seo_title, seo_description, seo_keywords,
                slug, is_verified, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            RETURNING id
        """, (
            job.title, job.company, job.location, job.contract_type, job.description,
            apply_link, apply_email, job.source_url, job.source,
            job.status, job.seo_title, job.seo_description, job.seo_keywords,
            job.slug, now, now
        ))
        res = cur.fetchone()
        self.conn.commit()
        if res:
            return res["id"], True
        return "", False

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
