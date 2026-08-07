#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/core/similarity_check.py
  Contrôle anti-duplication (PARTIE 2 — §2.6 Contraintes de contenu)

  Objectif : garantir que la description Markdown réécrite par Gemini est
  bien UNIQUE et reformulée, jamais un copier-coller de la source officielle
  (risque de pénalité Google pour contenu dupliqué).

  Méthode :
    1. Normalisation : minuscules, accents supprimés, ponctuation/Markdown
       retirés, espaces uniformisés.
    2. Deux mesures complémentaires, on conserve le MAX :
       • ratio de séquence (difflib.SequenceMatcher sur les tokens) — détecte
         les copier-coller et reformulations trop fidèles ;
       • indice de Jaccard sur les n-grams de 4 tokens — robuste aux
         changements d'ordre des phrases.

  Seuil par défaut : 30 % (SIMILARITY_THRESHOLD). Au-dessus → la fiche est
  marquée `confidence='low'` et signalée à la modération manuelle pour
  réécriture (jamais publiée automatiquement : tout passe par /admin/exams).

  Usage :  from scraper.core.similarity_check import text_similarity
===============================================================================
"""

from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher

# Seuil de similarité au-delà duquel une fiche doit être réécrite (30 %).
SIMILARITY_THRESHOLD = 0.30

# Caractères "bruit" (Markdown, ponctuation, séparateurs).
_NOISE_RE = re.compile(r"[*#_`>\[\](){}|!?.,;:'\"«»<>/\\\n\r\t—–…·•]+")


def normalize(text: str) -> str:
    """Normalise un texte pour comparaison : minuscules, sans accents ni bruit."""
    if not text:
        return ""
    # Décomposition Unicode + suppression des accents.
    decomposed = unicodedata.normalize("NFD", text)
    no_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    cleaned = _NOISE_RE.sub(" ", no_accents)
    return re.sub(r"\s+", " ", cleaned).strip().lower()


def _ngrams(tokens: list[str], n: int = 4) -> set[str]:
    """n-grams de tokens (défaut 4, pour être insensible à l'ordre local)."""
    if len(tokens) < n:
        return {" ".join(tokens)}
    return {" ".join(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


def text_similarity(source: str, rewritten: str) -> float:
    """Similarité 0..1 entre le texte source et la réécriture (max des mesures).

    ~1.0  → copie quasi intégrale (à réécrire impérativement)
    >0.30 → au-delà du seuil : signaler à la modération
    <0.30 → reformulation satisfaisante

    Métriques combinées (max) : ratio de séquence LCS, Jaccard symétrique sur
    n-grams, et couverture (n-grams de la réécriture présents dans la source).
    """
    tokens_a = normalize(source).split()
    tokens_b = normalize(rewritten).split()
    if not tokens_a or not tokens_b:
        return 0.0

    # Mesure 1 : ratio de séquence (copier-coller / reformulation légère).
    sequence_ratio = SequenceMatcher(None, tokens_a, tokens_b).ratio()

    # Mesure 2 : Jaccard sur n-grams de 4 tokens (ordre des phrases modifié).
    source_grams = _ngrams(tokens_a)
    rewrite_grams = _ngrams(tokens_b)
    union = source_grams | rewrite_grams
    jaccard = len(source_grams & rewrite_grams) / len(union) if union else 0.0

    # Mesure 3 : COUVERTURE (directionnelle) — part des n-grams de la
    # RÉÉCRITURE présents dans la source. Pertinente quand la source (page
    # complète) est bien plus longue que la description : une copie partielle
    # reste détectée.
    coverage = (
        len(source_grams & rewrite_grams) / len(rewrite_grams)
        if rewrite_grams
        else 0.0
    )

    return max(sequence_ratio, jaccard, coverage)


def needs_rewrite(source: str, rewritten: str, threshold: float = SIMILARITY_THRESHOLD) -> bool:
    """True si la réécriture est trop proche de la source (copie)."""
    return text_similarity(source, rewritten) > threshold
