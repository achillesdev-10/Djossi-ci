#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/core/cleaner.py
  Nettoyage & structuration des descriptions scrapées (avant stockage)

  Problème : les pages d'annonces sont scrapées en un blob brut contenant
  le header du site (entreprise, « Postuler », Secteur/Lieu/Niveau,
  compteur de vues…), le contenu réel, puis le footer (avis de sécurité,
  encarts publicitaires, listes d'autres offres, compteurs de fans…).

  Ce module extrait le contenu réel, le structure en Markdown lisible
  (sections « ## ») et corrige les artefacts d'extraction HTML
  (mots coupés en deux lignes, listes non normalisées, lignes vides).

  Miroir TypeScript : src/lib/descriptionCleaner.ts (admin dashboard)
===============================================================================
"""

from __future__ import annotations

import re
from typing import List

# -----------------------------------------------------------------------------
# Marqueurs de FIN de contenu (footer / publicité / autres offres)
# Dès qu'une ligne contient l'un de ces fragments, on arrête la collecte.
# -----------------------------------------------------------------------------
# Marqueurs FORTS : toujours considérés comme du bruit de fin de page.
_STRONG_FOOTER_MARKERS = [
    "avis important aux candidats",
    "ne versez jamais d'argent",
    "ne versez jamais d’argent",
    "méfiez-vous des frais",
    "signalez toute activité",
    "décline toute responsabilité",
    "signaler un abus",
    "signaler une erreur ou un abus",
    "signaler une erreur",
    "plainte@",
    "expire bientôt",
    "expire bientot",
]

# Marqueurs FAIBLES : on ne coupe QUE si la ligne ressemble à du bruit d'UI
# (compteur social, encart publicitaire, « Voir tout » isolé) — pas si le mot
# apparaît dans une phrase légitime (ex. « gestion de la publicité »).
_WEAK_FOOTER_PATTERNS = [
    re.compile(r"^[\-–—•]?\s*\d[\d\s\u00a0.,]*\s*(fans|suiveurs|abonn)", re.I),
    re.compile(r"^[\-–—•]?\s*(publicité|publicite)\s*[\-–—•]*\s*$", re.I),
    re.compile(r"^voir (tout|plus)$", re.I),
]

# -----------------------------------------------------------------------------
# Lignes de MÉTADONNÉES (header de page) : ignorées tant que le contenu
# réel n'a pas commencé (avant l'ancre « Détails de l'offre »).
# -----------------------------------------------------------------------------
_META_PATTERNS = [
    re.compile(r"^emploi\s*\(", re.I),
    re.compile(r"^postuler\s*$", re.I),
    re.compile(r"^partager\s*$", re.I),
    re.compile(r"^whatsapp\s*$", re.I),
    re.compile(r"^(secteur|lieu|niveau|date limite|publi[eé]e le)\b", re.I),
    re.compile(r"^\d+[\s\u00a0]?vues?$", re.I),
    re.compile(r"^pour signaler", re.I),
    re.compile(r"^plainte@", re.I),
    re.compile(r"^cliquez ici", re.I),
    re.compile(r"^suivre\s*$", re.I),
    re.compile(r"^s'abonner\s*$", re.I),
    re.compile(r"^partager sur", re.I),
]

# -----------------------------------------------------------------------------
# Titres de sections -> rendus en « ## » (Markdown) pour une lecture propre.
# -----------------------------------------------------------------------------
_SECTION_HEADERS = {
    "activites", "activités", "missions", "mission", "mission principale",
    "missions principales", "profil", "profil recherche", "profil recherché",
    "savoir faire", "savoir etre", "savoir-être", "savoir être",
    "qualifications", "responsabilites", "responsabilités", "conditions",
    "type de contrat", "description du poste", "description de l'offre",
    "description de l’offre", "avantages", "benefices", "bénéfices",
    "comment postuler", "candidature", "nous offrons", "profil du candidat",
    "exigences du poste", "votre profil", "vos missions", "le poste",
    "qui sommes-nous ?", "qui sommes-nous", "à propos de l'entreprise",
    "à propos de l’entreprise", "entreprise", "information",
}

# Détection d'un en-tête tout en majuscules court (ex: « ACTIVITES »).
_ALL_CAPS_HEADER = re.compile(r"^[A-ZÀÂÇÉÈÊËÎÏÔÛÙÜŸ][A-ZÀÂÇÉÈÊËÎÏÔÛÙÜŸ0-9 .\-'’]{2,45}$")

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

# Lettres qui forment un mot à part entière en français (« à », « a », « y »…) :
# on les rejoint AVEC un espace. Les consonnes isolées sont presque toujours des
# fragments de mots coupés par l'extraction HTML → rejointes SANS espace.
_VOWEL_LETTERS = set("àaéèêëîïôöùüyé")
_CONSONANT_LETTERS = set("bcdfghjklmnpqrstvwxz")


def _is_footer(line: str) -> bool:
    low = line.strip().lower()
    if any(marker in low for marker in _STRONG_FOOTER_MARKERS):
        return True
    return any(p.match(low) for p in _WEAK_FOOTER_PATTERNS)


def _is_meta(line: str) -> bool:
    # Les lignes de métadonnées sont courtes. Une ligne longue qui commence par
    # « Niveau », « Secteur »… est du contenu réel (ex. « Niveau BAC+5 …
    # description complète… ») : on ne doit jamais la jeter.
    if len(line) > 60:
        return False
    return any(p.match(line) for p in _META_PATTERNS)


def _is_section_header(line: str) -> str | None:
    """Retourne le titre de section normalisé si la ligne est un en-tête, sinon None."""
    stripped = line.strip().strip("*").strip(":")
    if not stripped or len(stripped) > 50:
        return None
    low = stripped.lower().strip()
    if low in _SECTION_HEADERS:
        return stripped
    if _ALL_CAPS_HEADER.match(stripped) and len(stripped) >= 4:
        return stripped
    return None


def _looks_like_title(line: str, title: str | None) -> bool:
    if not title:
        return False
    return line.lower().strip() == title.lower().strip()


def _join_split_words(lines: List[str]) -> List[str]:
    """
    Corrige les mots coupés par l'extraction HTML : une ligne se terminant
    par un mot d'1 caractère suivie d'une ligne commençant en minuscule
    sont fusionnées (« afin de p\\ni loter » → « afin de piloter »).
    """
    result: List[str] = []
    for line in lines:
        if not result:
            result.append(line)
            continue
        prev = result[-1].rstrip()
        words = prev.split(" ")
        if not words:
            result.append(line)
            continue
        last_word = words[-1].strip("'’")
        merged = False
        if len(last_word) <= 1 and line and (line[0].islower() or line[0] == "@"):
            if last_word.lower() in _VOWEL_LETTERS:
                # « Cv et LM à » + « eburkajob@gmail.com » → avec espace
                result[-1] = f"{prev} {line}"
            else:
                # Fragment de mot coupé : « afin de p » + « iloter » → « piloter »
                result[-1] = f"{prev}{line}"
            merged = True
        elif len(last_word) <= 2 and len(prev) <= 20 and line and line[0].islower():
            result[-1] = f"{prev} {line}"
            merged = True
        if not merged:
            result.append(line)
    return result


def _normalize_bullets(lines: List[str]) -> List[str]:
    """Normalise les puces (« - », « • ») en puces Markdown « - » et dédoublonne."""
    out: List[str] = []
    seen: set[str] = set()
    for line in lines:
        stripped = line.strip()
        bullet = None
        content = stripped
        m = re.match(r"^[\-–—•▪◦]\s*(.*)$", stripped)
        if m:
            bullet = "-"
            content = m.group(1).strip()
        if not content:
            continue
        # Lignes orphelines de ponctuation (« . », « : »…) laissées par le HTML.
        if re.fullmatch(r"[.…,;:!?]+\s*", content):
            continue
        if content in seen:
            continue
        seen.add(content)
        out.append(f"{bullet + ' ' if bullet else ''}{content}")
    return out


def _collapse_blank_lines(lines: List[str]) -> List[str]:
    out: List[str] = []
    prev_blank = False
    for line in lines:
        if not line.strip():
            if not prev_blank and out:
                out.append("")
            prev_blank = True
        else:
            out.append(line.strip())
            prev_blank = False
    while out and not out[-1].strip():
        out.pop()
    return out


def clean_description(raw: str, title: str | None = None, source: str | None = None) -> str:
    """
    Nettoie une description brute scrapée et la structure en Markdown.

    Stratégie :
      1. On repère l'ancre « Détails de l'offre » (source Educarriere & co) :
         tout ce qui précède (header du site) est ignoré.
      2. Sinon, on ignore les lignes de métadonnées classiques.
      3. On arrête à la première ligne de footer (avis, publicité, autres offres).
      4. On structure les en-têtes de section en « ## », on normalise les
         puces, on corrige les mots coupés et on nettoie les lignes vides.
    """
    if not raw:
        return ""

    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    lines = [l for l in text.split("\n")]

    # 1. Recherche de l'ancre de contenu réel.
    anchor_index = None
    for i, line in enumerate(lines):
        if re.search(r"d[ée]tails de l'offre", line, re.I) or re.search(
            r"d[ée]tails de l’offre", line, re.I
        ):
            anchor_index = i
            break

    if anchor_index is not None:
        lines = lines[anchor_index + 1:]
    else:
        # Pas d'ancre : on saute les métadonnées du header.
        lines = [l for l in lines if not _is_meta(l)]

    # 2. Collecte du contenu jusqu'au footer.
    collected: List[str] = []
    started = anchor_index is not None
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if started:
                collected.append("")
            continue
        if _is_footer(stripped):
            break
        if not started:
            # Tant que le contenu n'est pas « amorcé », on ignore les
            # métadonnées et les lignes trop courtes (puces orphelines…).
            if _is_meta(stripped):
                continue
            if len(stripped) < 12 and not _is_section_header(stripped):
                continue
            started = True
        if _looks_like_title(stripped, title):
            continue
        collected.append(stripped)

    if not collected:
        # Échec d'extraction : on garde le texte brut (jamais vide).
        collected = [l.strip() for l in lines if l.strip()]

    # 3. Structuration.
    structured: List[str] = []
    for line in collected:
        header = _is_section_header(line)
        if header:
            structured.append("")
            structured.append(f"## {header}")
            structured.append("")
        else:
            structured.append(line)

    structured = _join_split_words(structured)
    structured = _normalize_bullets(structured)
    structured = _collapse_blank_lines(structured)

    result = "\n".join(structured).strip()
    # 4. Garde-fous finaux : pas de points de suspension en cascade ni de
    #    lignes de publicité résiduelles.
    result = re.sub(r"\n{3,}", "\n\n", result)
    result = re.sub(r"(?m)^[-–—]\s*$", "", result)

    # 5. Longueur maximale raisonnable (le contenu utile dépasse rarement 8 000).
    if len(result) > 12000:
        result = result[:12000].rsplit("\n", 1)[0]

    return result.strip()


def clean_job(job) -> None:
    """Nettoie la description (et normalise le titre) d'une offre Job in-place."""
    if job.description:
        job.description = clean_description(job.description, title=job.title)
    if job.title:
        job.title = re.sub(r"\s+", " ", job.title).strip()
