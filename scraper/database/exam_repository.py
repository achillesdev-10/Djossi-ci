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
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from scraper.models.exam_item import (
    ExamItem,
    compute_min_diploma_level,
    url_hostname,
)

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

    @staticmethod
    def _url_specificity(url: Optional[str]) -> int:
        """Nombre de segments de chemin — l'URL la plus spécifique (fiche détail)
        gagne face à une page générique (racine du site) lors d'une fusion."""
        if not url:
            return 0
        try:
            from urllib.parse import urlsplit

            path = urlsplit(url).path
        except ValueError:
            return 0
        return len([s for s in path.split("/") if s])

    def _find_existing(self, item: ExamItem) -> tuple[Optional[sqlite3.Row], str]:
        """Recherche l'id d'un concours déjà en base.

        Ordre de déduction (du plus fort au plus faible signal) :
          1. source_url EXACTE (URLs normalisées côté modèle) ;
          2. titre + organisateur + MÊME domaine source, insensibles à la casse
             (intitulés identiques — ex. « CONCOURS ADMINISTRATIFS 2026 ») ;
          3. titre identique + MÊME domaine source, organisateur différent
             (dédup inter-sources : la même annonce scrapée par deux sources ne
             doit créer qu'une fiche).

        NB — compromis assumé : un intitulé identique sur le même domaine est
        considéré comme le même concours. Pour un communiqué multi-filières
        (ex. INFAS, une entrée par filière), les filières ont le même titre ET
        le même organisateur : la règle 2 les fusionnerait. En pratique chaque
        URL scrapée produit UNE fiche (le communiqué regroupe les filières), et
        les fiches multi-filières distinctes ont des URLs différentes — la
        règle 1 les distingue. À garder en tête si le runner venait à éclater
        une fiche par filière.
        """
        assert self.conn is not None
        cur = self.conn.cursor()
        title_key = item.title.strip().upper()
        org_key = item.organizer.strip().upper()
        host = url_hostname(item.source_url)
        # 1) URL exacte.
        cur.execute(
            "SELECT id, source_url FROM exams WHERE source_url = ? LIMIT 1",
            (item.source_url,),
        )
        row = cur.fetchone()
        if row:
            return row, "url"
        # 2) Titre + organisateur + même domaine, insensibles à la casse.
        if host:
            cur.execute(
                "SELECT id, source_url FROM exams "
                "WHERE UPPER(TRIM(title)) = ? AND UPPER(TRIM(organizer)) = ? "
                "LIMIT 50",
                (title_key, org_key),
            )
            for cand in cur.fetchall():
                if url_hostname(cand["source_url"]) == host:
                    return cand, "title_organizer"
        # 3) Titre identique + même domaine source, organisateur différent.
        if host:
            cur.execute(
                "SELECT id, source_url FROM exams WHERE UPPER(TRIM(title)) = ? LIMIT 50",
                (title_key,),
            )
            for cand in cur.fetchall():
                if url_hostname(cand["source_url"]) == host:
                    return cand, "title_domain"
        return None, ""

    def upsert(self, item: ExamItem) -> tuple[str, bool]:
        """Insère ou met à jour un concours.

        Déduplication robuste : source_url exacte → titre+organisateur
        (insensible à la casse) → titre + domaine source. La fiche la plus
        spécifique (URL de détail) gagne lors d'une fusion inter-sources.
        """
        assert self.conn is not None
        row, match_mode = self._find_existing(item)
        cur = self.conn.cursor()
        now = datetime.now().isoformat()

        # Fusion par titre+domaine : la fiche la plus spécifique (URL de détail)
        # gagne. Si l'existant est DÉJÀ aussi spécifique (ou plus) que le nouvel
        # item (ex. page d'accueil scrapée par une autre source), on ignore le
        # doublon : on ne réécrit PAS l'organisateur de la fiche en place avec
        # celui d'une source tierce (corruption potentielle).
        source_url = item.source_url
        if row and match_mode == "title_domain":
            existing_url = row["source_url"] or ""
            if self._url_specificity(existing_url) >= self._url_specificity(source_url):
                return row["id"], False

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
            source_url,
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
                    title = ?, organizer = ?, category = ?, exam_type = ?, description_md = ?,
                    registration_start = ?, registration_end = ?, exam_date = ?, results_date = ?,
                    age_min = ?, age_max = ?, age_reference_date = ?, nationality = ?, diplomas = ?,
                    min_diploma_level = ?, positions_count = ?, registration_fee = ?, location = ?,
                    cities = ?, documents = ?, source_url = ?, source_website = ?, status = ?,
                    confidence = ?, seo_title = ?, seo_description = ?, seo_keywords = ?, slug = ?,
                    updated_at = ?
                  WHERE id = ?""",
                (*payload, now, exam_id),
            )
            self.conn.commit()
            self._supabase_upsert(item)
            return exam_id, False

        # id généré EXPLICITEMENT : certaines bases locales ont été créées sans
        # DEFAULT sur la colonne id (CREATE TABLE IF NOT EXISTS + schéma plus
        # ancien) — sans cela l'INSERT produisait des lignes avec id NULL
        # (4 lignes constatées en base locale).
        exam_id = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO exams (
                id, title, organizer, category, exam_type, description_md,
                registration_start, registration_end, exam_date, results_date,
                age_min, age_max, age_reference_date, nationality, diplomas,
                min_diploma_level, positions_count, registration_fee, location,
                cities, documents, source_url, source_website, status, confidence,
                seo_title, seo_description, seo_keywords, slug, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?
            )""",
            (exam_id, *payload, now, now),
        )
        self.conn.commit()
        self._supabase_upsert(item)
        return exam_id, True

    # ------------------------------------------------------------------
    def _supabase_upsert(self, item: ExamItem) -> None:
        if self.supabase is None:
            return
        try:
            table = self.supabase.table("exams")
            existing: Optional[Dict[str, Any]] = None
            match_mode = ""
            # Miroir de _find_existing : URL exacte → titre+organisateur
            # (insensible à la casse) → titre + même domaine source.
            if item.source_url:
                resp = (
                    table.select("id,status,source_url")
                    .eq("source_url", item.source_url)
                    .limit(1)
                    .execute()
                )
                rows = resp.data or []
                if rows:
                    existing = rows[0]
                    match_mode = "url"
            if existing is None:
                host = url_hostname(item.source_url)
                if host:
                    resp = (
                        table.select("id,status,source_url")
                        .ilike("title", item.title.strip())
                        .ilike("organizer", item.organizer.strip())
                        .limit(50)
                        .execute()
                    )
                    for cand in resp.data or []:
                        if url_hostname(cand.get("source_url")) == host:
                            existing = cand
                            match_mode = "title_organizer"
                            break
            if existing is None:
                host = url_hostname(item.source_url)
                if host:
                    resp = (
                        table.select("id,status,source_url")
                        .ilike("title", item.title.strip())
                        .limit(50)
                        .execute()
                    )
                    for cand in resp.data or []:
                        if url_hostname(cand.get("source_url")) == host:
                            existing = cand
                            match_mode = "title_domain"
                            break

            # Fusion par titre+domaine : si l'existant est déjà aussi spécifique
            # (ou plus) que le nouvel item, on ignore le doublon — on ne réécrit
            # pas l'organisateur de la fiche en place.
            source_url = item.source_url
            if existing and match_mode == "title_domain":
                existing_url = existing.get("source_url") or ""
                if self._url_specificity(existing_url) >= self._url_specificity(source_url):
                    return

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
                "source_url": source_url,
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

    # ------------------------------------------------------------------
    def auto_publish_pending(self, max_age_minutes: int = 21) -> int:
        """
        Publication AUTOMATIQUE des concours en attente depuis plus de
        `max_age_minutes` minutes (défaut : 21 min — miroir des offres).

        L'admin garde la main pendant les premières minutes : s'il se connecte
        à /admin/exams, il peut valider ou rejeter. Passé ce délai, les
        concours sont publiés automatiquement pour que la page /concours ne
        reste jamais vide faute de modération manuelle.

        NB : les dates sont comparées via julianday() car la colonne created_at
        mêle des formats « YYYY-MM-DD HH:MM:SS » (défaut SQLite) et ISO avec
        « T » (écritures Node/Python) — la comparaison lexicographique directe
        serait faussée.
        """
        assert self.conn is not None
        # UTC explicite : aligné sur le service Next.js (toISOString) pour que
        # la règle des 21 minutes soit identique partout.
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)).isoformat()
        cur = self.conn.execute(
            """
            UPDATE exams
               SET status = 'published',
                   is_verified = 1,
                   published_at = COALESCE(published_at, datetime('now')),
                   updated_at = datetime('now')
             WHERE status = 'pending'
               AND julianday(created_at) < julianday(?)
            """,
            (cutoff,),
        )
        self.conn.commit()
        count = int(cur.rowcount or 0)

        # Miroir Supabase (production / CI) : la base SQLite y est vide, la
        # logique doit aussi s'appliquer côté Supabase.
        if self.supabase is not None:
            try:
                resp = (
                    self.supabase.table("exams")
                    .update(
                        {
                            "status": "published",
                            "is_verified": True,
                            "published_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    .eq("status", "pending")
                    .lt("created_at", cutoff)
                    .select("id")
                    .execute()
                )
                count += len(resp.data or [])
            except Exception as exc:
                _log_warning(f"Échec auto-publication Supabase exams : {exc}")
        return count

    def purge_old_exams(self, max_age_days: int = 35) -> int:
        """
        Suppression AUTOMATIQUE des concours dont l'information a été collectée
        il y a plus de `max_age_days` jours (défaut : 5 semaines = 35 jours).

        Une annonce dont la date de fin d'inscription est encore dans le futur
        est conservée, même si la fiche a plus de 35 jours : on ne supprime
        jamais un concours toujours ouvert.
        """
        assert self.conn is not None
        now = datetime.now(timezone.utc).isoformat()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=max_age_days)).isoformat()
        # julianday() : les colonnes mêlent « YYYY-MM-DD HH:MM:SS » (défaut
        # SQLite) et ISO avec « T » (écritures Node/Python) — la comparaison
        # lexicographique directe serait faussée.
        cur = self.conn.execute(
            "DELETE FROM exams "
            "WHERE julianday(created_at) < julianday(?) "
            "AND (registration_end IS NULL OR julianday(registration_end) < julianday(?))",
            (cutoff, now),
        )
        self.conn.commit()
        count = cur.rowcount

        # Miroir Supabase (production / CI) : la base SQLite y est vide, la
        # logique doit aussi s'appliquer côté Supabase.
        if self.supabase is not None:
            try:
                resp = (
                    self.supabase.table("exams")
                    .delete()
                    .lt("created_at", cutoff)
                    .is_("registration_end", None)
                    .execute()
                )
                count += len(resp.data or [])
                resp = (
                    self.supabase.table("exams")
                    .delete()
                    .lt("created_at", cutoff)
                    .lt("registration_end", now)
                    .execute()
                )
                count += len(resp.data or [])
            except Exception as exc:
                _log_warning(f"Échec purge Supabase exams : {exc}")
        return count
