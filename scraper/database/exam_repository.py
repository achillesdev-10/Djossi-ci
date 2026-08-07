#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/database/exam_repository.py
  Repository de stockage des concours (table `exams` — SQLite / Supabase)

  Miroir Python de la migration Supabase 0010_create_exams_table.sql et du
  service Next.js src/services/examService.ts. Les concours arrivent en statut
  'pending' (file de modération /admin/exams).
===============================================================================
"""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from scraper.models.exam_item import ExamItem, compute_min_diploma_level

try:
    from supabase import create_client, Client as SupabaseClient
except ImportError:  # pragma: no cover
    SupabaseClient = None  # type: ignore


def _log_warning(message: str) -> None:
    try:
        import logging

        logging.getLogger("scraper.exam_repository").warning(message)
    except Exception:
        print(f"[exam_repository] {message}")


class ExamRepository:
    def __init__(
        self,
        db_path: Path,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
    ):
        self.db_path = db_path
        self.conn: sqlite3.Connection | None = None
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.supabase: Optional[SupabaseClient] = None
        if SupabaseClient is not None and self.supabase_url and self.supabase_key:
            self.supabase = create_client(self.supabase_url, self.supabase_key)

    def __enter__(self) -> "ExamRepository":
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.db_path), timeout=30)
        self.conn.row_factory = sqlite3.Row
        self._ensure_schema()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.commit()
            self.conn.close()

    # ------------------------------------------------------------------
    def _ensure_schema(self) -> None:
        assert self.conn is not None
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS exams (
              id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
              title               TEXT NOT NULL,
              slug                TEXT,
              organizer           TEXT NOT NULL,
              category            TEXT NOT NULL DEFAULT 'administratif',
              exam_type           TEXT,
              status              TEXT NOT NULL DEFAULT 'pending',
              description_md      TEXT NOT NULL DEFAULT '',
              registration_start  TEXT,
              registration_end    TEXT,
              exam_date           TEXT,
              results_date        TEXT,
              age_min             INTEGER,
              age_max             INTEGER,
              age_reference_date  TEXT,
              nationality         TEXT,
              diplomas            TEXT NOT NULL DEFAULT '[]',
              min_diploma_level   INTEGER,
              positions_count     INTEGER,
              registration_fee    TEXT,
              location            TEXT,
              cities              TEXT NOT NULL DEFAULT '[]',
              documents           TEXT NOT NULL DEFAULT '[]',
              source_url          TEXT,
              source_website      TEXT,
              confidence          TEXT NOT NULL DEFAULT 'medium',
              views_count         INTEGER NOT NULL DEFAULT 0,
              is_verified         INTEGER NOT NULL DEFAULT 0,
              seo_title           TEXT,
              seo_description     TEXT,
              seo_keywords        TEXT,
              published_at        TEXT,
              created_at          TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_exams_status ON exams (status)"
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_exams_category ON exams (category)"
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_exams_registration_end ON exams (registration_end)"
        )

    # ------------------------------------------------------------------
    def _iso(self, value: Optional[datetime]) -> Optional[str]:
        return value.isoformat() if value else None

    def upsert(self, item: ExamItem) -> tuple[str, bool]:
        """Insère ou met à jour un concours (dédup par titre+organisateur ou source_url)."""
        assert self.conn is not None
        cur = self.conn.cursor()
        cur.execute(
            "SELECT id FROM exams WHERE source_url = ? OR (title = ? AND organizer = ?) LIMIT 1",
            (item.source_url, item.title, item.organizer),
        )
        row = cur.fetchone()
        now = datetime.now().isoformat()

        payload = (
            item.title,
            item.organizer,
            item.category,
            item.exam_type,
            item.description_md,
            self._iso(item.registration_start),
            self._iso(item.registration_end),
            self._iso(item.exam_date),
            self._iso(item.results_date),
            item.age_min,
            item.age_max,
            item.age_reference_date,
            item.nationality,
            json.dumps(item.diplomas, ensure_ascii=False),
            compute_min_diploma_level(item.diplomas),
            item.positions_count,
            item.registration_fee,
            item.location,
            json.dumps(item.cities, ensure_ascii=False),
            json.dumps(item.documents, ensure_ascii=False),
            item.source_url,
            item.source,
            item.status,
            item.confidence,
            item.seo_title,
            item.seo_description,
            item.seo_keywords,
            item.slug,
        )

        if row:
            exam_id = row["id"]
            cur.execute(
                """UPDATE exams SET
                    title=?, organizer=?, category=?, exam_type=?, description_md=?,
                    registration_start=?, registration_end=?, exam_date=?, results_date=?,
                    age_min=?, age_max=?, age_reference_date=?, nationality=?, diplomas=?,
                    min_diploma_level=?, positions_count=?, registration_fee=?, location=?,
                    cities=?, documents=?, source_url=?, source_website=?, confidence=?,
                    seo_title=?, seo_description=?, seo_keywords=?, slug=?, updated_at=?
                  WHERE id=?""",
                (*payload, now, exam_id),
            )
            self.conn.commit()
            self._supabase_upsert(item)
            return exam_id, False

        cur.execute(
            """INSERT INTO exams (
                title, organizer, category, exam_type, description_md,
                registration_start, registration_end, exam_date, results_date,
                age_min, age_max, age_reference_date, nationality, diplomas,
                min_diploma_level, positions_count, registration_fee, location,
                cities, documents, source_url, source_website, status, confidence,
                seo_title, seo_description, seo_keywords, slug, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            RETURNING id""",
            (*payload, now, now),
        )
        res = cur.fetchone()
        self.conn.commit()
        if res:
            self._supabase_upsert(item)
            return res["id"], True
        return "", False

    # ------------------------------------------------------------------
    def _supabase_upsert(self, item: ExamItem) -> None:
        if self.supabase is None:
            return
        try:
            table = self.supabase.table("exams")
            existing: Optional[Dict[str, Any]] = None
            if item.source_url:
                resp = (
                    table.select("id,status")
                    .eq("source_url", item.source_url)
                    .limit(1)
                    .execute()
                )
                rows = resp.data or []
                if rows:
                    existing = rows[0]
            if existing is None:
                resp = (
                    table.select("id,status")
                    .eq("title", item.title)
                    .eq("organizer", item.organizer)
                    .limit(1)
                    .execute()
                )
                rows = resp.data or []
                if rows:
                    existing = rows[0]

            payload = {
                "title": item.title,
                "organizer": item.organizer,
                "category": item.category,
                "exam_type": item.exam_type,
                "description_md": item.description_md,
                "registration_start": self._iso(item.registration_start),
                "registration_end": self._iso(item.registration_end),
                "exam_date": self._iso(item.exam_date),
                "results_date": self._iso(item.results_date),
                "age_min": item.age_min,
                "age_max": item.age_max,
                "age_reference_date": item.age_reference_date,
                "nationality": item.nationality,
                "diplomas": item.diplomas,
                "min_diploma_level": compute_min_diploma_level(item.diplomas),
                "positions_count": item.positions_count,
                "registration_fee": item.registration_fee,
                "location": item.location,
                "cities": item.cities,
                "documents": item.documents,
                "source_url": item.source_url,
                "source_website": item.source,
                "status": item.status,
                "confidence": item.confidence,
                "seo_title": item.seo_title,
                "seo_description": item.seo_description,
                "seo_keywords": item.seo_keywords,
                "slug": item.slug,
            }
            if existing:
                table.update(payload).eq("id", existing["id"]).execute()
            else:
                table.insert(payload).execute()
        except Exception as exc:
            _log_warning(f"Échec de l'upsert Supabase exams : {exc}")

    # ------------------------------------------------------------------
    def add_log(self, status: str, added: int, message: str) -> int:
        assert self.conn is not None
        cur = self.conn.execute(
            "INSERT INTO scraper_logs (status, offers_added, message) VALUES (?, ?, ?) RETURNING id",
            (status, added, message),
        )
        res = cur.fetchone()
        log_id = int(res["id"]) if res else 0
        self.conn.commit()
        if self.supabase is not None:
            try:
                self.supabase.table("scraper_logs").insert(
                    {"status": status, "offers_added": int(added), "message": message}
                ).execute()
            except Exception as exc:
                _log_warning(f"Échec du log Supabase : {exc}")
        return log_id

    def finish_log(self, log_id: int, status: str, added: int, message: str) -> None:
        assert self.conn is not None
        self.conn.execute(
            "UPDATE scraper_logs SET status = ?, offers_added = ?, message = ?, finished_at = datetime('now') WHERE id = ?",
            (status, added, message, log_id),
        )
        self.conn.commit()

    def stats(self) -> Dict[str, Any]:
        assert self.conn is not None
        cur = self.conn.execute(
            "SELECT COUNT(*) AS total, "
            "SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending, "
            "SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) AS published "
            "FROM exams"
        )
        row = cur.fetchone() or {"total": 0, "pending": 0, "published": 0}
        return {k: int(v or 0) for k, v in dict(row).items()}
