#!/usr/bin/env python3
"""Build the bilingual pair library from Project Gutenberg's catalog.

Project Gutenberg has no field linking an original-language work to its English
translation. This script reconstructs those pairs from the official catalog
(`pg_catalog.csv`) using the one reliable signal: an original and its
translation share the same primary *author identity* (name + life dates), and
the English edition is a translation of that author's work.

Pipeline:
  1. Parse the catalog and normalize author identity + titles.
  2. Group works by author; within each author, match every single-language
     non-English original to the best English edition by the same author.
  3. Score each pair's confidence and emit `src/data/library.json`.

Run:  python scripts/ingest/build_library.py
"""
from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
import urllib.request
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

CATALOG_URL = "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz"
HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
RAW_CSV = HERE / "pg_catalog.csv"
OUT_JSON = REPO / "src" / "data" / "library.json"

# Confidence threshold below which a candidate pair is discarded. Validated by
# spot-checking bands: >=0.6 is reliably correct, below that is noisy.
MIN_CONFIDENCE = 0.6

LANGUAGE_NAMES = {
    "af": "Afrikaans", "ar": "Arabic", "bg": "Bulgarian", "ca": "Catalan",
    "cs": "Czech", "cy": "Welsh", "da": "Danish", "de": "German", "el": "Greek",
    "en": "English", "eo": "Esperanto", "es": "Spanish", "et": "Estonian",
    "fa": "Persian", "fi": "Finnish", "fr": "French", "fur": "Friulian",
    "ga": "Irish", "br": "Breton", "gd": "Scottish Gaelic", "oc": "Occitan",
    "sco": "Scots",
    "he": "Hebrew", "hu": "Hungarian", "is": "Icelandic", "it": "Italian",
    "ja": "Japanese", "la": "Latin", "lt": "Lithuanian", "nl": "Dutch",
    "no": "Norwegian", "pl": "Polish", "pt": "Portuguese", "ro": "Romanian",
    "ru": "Russian", "sa": "Sanskrit", "sr": "Serbian", "sv": "Swedish",
    "tl": "Tagalog", "zh": "Chinese",
}

# Title noise: leading articles and common subtitle separators.
ARTICLES = {
    "the", "a", "an", "le", "la", "les", "un", "une", "des", "der", "die",
    "das", "el", "los", "las", "il", "lo", "gli", "een", "het", "de",
}


def strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )


def normalize_title(title: str) -> str:
    """Lowercase, drop subtitle, articles, and punctuation for matching."""
    t = strip_accents(title).lower()
    # Drop subtitle introduced by ", or", ";", " or ", or a colon.
    t = re.split(r",?\s+ou\b|,?\s+or\b|[;:]", t, maxsplit=1)[0]
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    words = [w for w in t.split() if w and w not in ARTICLES]
    return " ".join(words)


def primary_author(authors: str) -> str | None:
    """First author segment, before role markers or extra contributors."""
    if not authors:
        return None
    return authors.split(";")[0].strip()


def author_birth_year(author: str) -> int | None:
    m = re.search(r"(\d{3,4})\??\s*(BCE|BC)?\s*-", author)
    if not m:
        return None
    year = int(m.group(1))
    return -year if m.group(2) else year


def has_translator(authors: str) -> bool:
    return "[Translator]" in authors


def parse_year(issued: str) -> int | None:
    m = re.search(r"(\d{4})", issued or "")
    return int(m.group(1)) if m else None


def ensure_catalog() -> Path:
    if RAW_CSV.exists():
        return RAW_CSV
    print(f"Downloading catalog from {CATALOG_URL} ...", file=sys.stderr)
    import gzip
    gz = HERE / "pg_catalog.csv.gz"
    req = urllib.request.Request(CATALOG_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp, open(gz, "wb") as fh:
        fh.write(resp.read())
    with gzip.open(gz, "rb") as src, open(RAW_CSV, "wb") as dst:
        dst.write(src.read())
    gz.unlink(missing_ok=True)
    return RAW_CSV


def load_works() -> list[dict]:
    rows = list(csv.DictReader(open(ensure_catalog(), encoding="utf-8")))
    return [r for r in rows if r["Type"] == "Text"]


def is_english(r: dict) -> bool:
    return r["Language"] == "en"


def is_single_nonenglish(r: dict) -> bool:
    lang = r["Language"]
    return bool(lang) and lang != "en" and ";" not in lang


def score_pair(original: dict, english: dict, n_candidates: int) -> float:
    """Confidence in [0,1] that `english` is a translation of `original`."""
    title_sim = SequenceMatcher(
        None, normalize_title(original["Title"]), normalize_title(english["Title"])
    ).ratio()
    score = 0.55 * title_sim
    # An explicit [Translator] credit is a strong positive signal.
    if has_translator(english["Authors"]):
        score += 0.30
    # If the author has exactly one original and one English edition, the pair
    # is near-certain even when the translated title diverges.
    if n_candidates == 1:
        score += 0.20
    return min(score, 1.0)


def build() -> list[dict]:
    works = load_works()
    by_author: dict[str, list[dict]] = defaultdict(list)
    for r in works:
        pa = primary_author(r["Authors"])
        if pa:
            by_author[pa].append(r)

    pairs: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for author, items in by_author.items():
        english = [w for w in items if is_english(w)]
        originals = [w for w in items if is_single_nonenglish(w)]
        if not english or not originals:
            continue
        for orig in originals:
            best, best_score = None, 0.0
            for en in english:
                s = score_pair(orig, en, len(english))
                if s > best_score:
                    best, best_score = en, s
            if not best or best_score < MIN_CONFIDENCE:
                continue
            key = (orig["Text#"], best["Text#"])
            if key in seen:
                continue
            seen.add(key)
            lang_code = orig["Language"]
            subjects = [s.strip() for s in (orig["Subjects"] or "").split(";") if s.strip()]
            pairs.append(
                {
                    "id": f"pg-{orig['Text#']}-{best['Text#']}",
                    "originalId": int(orig["Text#"]),
                    "englishId": int(best["Text#"]),
                    "title": orig["Title"].replace("\r\n", " ").strip(),
                    "englishTitle": best["Title"].replace("\r\n", " ").strip(),
                    "author": author,
                    "authorBirthYear": author_birth_year(author),
                    "languageCode": lang_code,
                    "language": LANGUAGE_NAMES.get(lang_code, lang_code.upper()),
                    "year": parse_year(orig["Issued"]),
                    "hasTranslatorCredit": has_translator(best["Authors"]),
                    "confidence": round(best_score, 3),
                    "subjects": subjects[:6],
                }
            )

    # Each English edition should anchor at most one pair: when several
    # originals match the same translation (e.g. multi-volume collections),
    # keep the highest-confidence match.
    best_by_english: dict[int, dict] = {}
    for p in pairs:
        prev = best_by_english.get(p["englishId"])
        if prev is None or p["confidence"] > prev["confidence"]:
            best_by_english[p["englishId"]] = p
    deduped = list(best_by_english.values())

    deduped.sort(key=lambda p: (-p["confidence"], p["author"], p["title"]))
    return deduped


def main() -> None:
    pairs = build()
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(pairs, ensure_ascii=False, indent=0), encoding="utf-8")

    by_lang: dict[str, int] = defaultdict(int)
    high = 0
    for p in pairs:
        by_lang[p["language"]] += 1
        if p["confidence"] >= 0.8:
            high += 1
    print(f"Wrote {len(pairs)} pairs to {OUT_JSON.relative_to(REPO)}")
    print(f"  high-confidence (>=0.8): {high}")
    print("  by language:")
    for lang, n in sorted(by_lang.items(), key=lambda kv: -kv[1])[:15]:
        print(f"    {lang:12} {n}")


if __name__ == "__main__":
    main()
