#!/usr/bin/env python3
"""Fetch, clean, and segment paired Gutenberg texts into facing-page editions.

For each pair in `library.json` (highest-confidence first), this downloads the
original and English plaintext from gutenberg.org, strips the Project Gutenberg
boilerplate, reflows hard-wrapped lines into paragraphs, and builds facing-page
"spreads" by aligning the two texts proportionally (the same philosophy as the
reader's proportional scroll-sync, since translations differ in length).

Output: one `src/data/texts/<pair-id>.json` per cached pair, shaped like the
curated `CuratedWork` so the reader renders it with no special-casing.

Run:  python scripts/ingest/cache_texts.py --limit 60
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
RAW_CSV = HERE / "pg_catalog.csv"
LIBRARY = REPO / "src" / "data" / "library.json"
DL_CACHE = HERE / ".textcache"
OUT_DIR = REPO / "src" / "data" / "texts"
MANIFEST = REPO / "src" / "data" / "cached-texts.json"

TARGET_CHARS = 1500  # approx original characters per facing-page opening

START_RE = re.compile(r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*", re.I)
END_RE = re.compile(r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*", re.I)
DATE_TAIL_RE = re.compile(r",?\s*\d{3,4}\??\s*(BCE|BC)?\s*-\s*\d{0,4}\??\s*(BCE|BC)?\s*$")


def text_urls(book_id: int) -> list[str]:
    b = book_id
    return [
        f"https://www.gutenberg.org/cache/epub/{b}/pg{b}.txt",
        f"https://www.gutenberg.org/files/{b}/{b}-0.txt",
        f"https://www.gutenberg.org/files/{b}/{b}.txt",
        f"https://www.gutenberg.org/ebooks/{b}.txt.utf-8",
    ]


def download(book_id: int) -> str | None:
    DL_CACHE.mkdir(exist_ok=True)
    cached = DL_CACHE / f"{book_id}.txt"
    if cached.exists():
        return cached.read_text(encoding="utf-8", errors="replace")
    for url in text_urls(book_id):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
            cached.write_text(raw, encoding="utf-8")
            time.sleep(0.5)  # be polite to gutenberg.org
            return raw
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            continue
    return None


def strip_boilerplate(raw: str) -> str:
    start = START_RE.search(raw)
    end = END_RE.search(raw)
    body = raw[start.end() : end.start()] if start and end else raw
    # Drop a leading "Produced by ..." note that follows the start marker.
    body = re.sub(r"^\s*Produced by.*?(\n\n)", "", body, flags=re.S)
    return body.strip()


def to_paragraphs(body: str) -> list[str]:
    """Reflow hard-wrapped lines into paragraphs separated by blank lines."""
    body = body.replace("\r\n", "\n").replace("\r", "\n")
    paragraphs: list[str] = []
    buf: list[str] = []
    for line in body.split("\n"):
        if line.strip() == "":
            if buf:
                paragraphs.append(" ".join(s.strip() for s in buf).strip())
                buf = []
        else:
            buf.append(line)
    if buf:
        paragraphs.append(" ".join(s.strip() for s in buf).strip())
    return [p for p in paragraphs if p]


def paginate(paragraphs: list[str], target: int) -> list[list[str]]:
    """Greedily group whole paragraphs into pages of ~`target` characters."""
    pages: list[list[str]] = []
    cur: list[str] = []
    size = 0
    for p in paragraphs:
        cur.append(p)
        size += len(p)
        if size >= target:
            pages.append(cur)
            cur, size = [], 0
    if cur:
        pages.append(cur)
    return pages or [[]]


def slice_proportional(paragraphs: list[str], n_pages: int) -> list[list[str]]:
    """Split paragraphs into exactly n_pages proportional chunks."""
    out: list[list[str]] = []
    total = len(paragraphs)
    for i in range(n_pages):
        lo = round(i / n_pages * total)
        hi = round((i + 1) / n_pages * total)
        out.append(paragraphs[lo:hi])
    return out


def build_spreads(orig_paras: list[str], eng_paras: list[str]) -> list[dict]:
    orig_pages = paginate(orig_paras, TARGET_CHARS)
    n = len(orig_pages)
    eng_pages = slice_proportional(eng_paras, n)
    spreads = []
    for o, e in zip(orig_pages, eng_pages):
        spreads.append({"original": "\n\n".join(o), "english": "\n\n".join(e)})
    return spreads


def clean_person(name: str) -> str:
    """`Balzac, Honoré de, 1799-1850` -> `Honoré de Balzac`; `Voltaire` -> `Voltaire`."""
    name = DATE_TAIL_RE.sub("", name).strip().rstrip(",")
    if "," in name:
        surname, given = name.split(",", 1)
        return f"{given.strip()} {surname.strip()}".strip()
    return name


def sort_name(name: str) -> str:
    """Inverted name without dates, for citations: `Balzac, Honoré de`."""
    return DATE_TAIL_RE.sub("", name).strip().rstrip(",")


def find_translator(authors: str) -> str | None:
    for seg in authors.split(";"):
        seg = seg.strip()
        if "[Translator]" in seg:
            return clean_person(seg.replace("[Translator]", "").strip())
    return None


def load_catalog_index() -> dict[int, dict]:
    rows = csv.DictReader(open(RAW_CSV, encoding="utf-8"))
    return {int(r["Text#"]): r for r in rows if r["Type"] == "Text"}


def build_work(pair: dict, catalog: dict[int, dict]) -> dict | None:
    orig_raw = download(pair["originalId"])
    eng_raw = download(pair["englishId"])
    if not orig_raw or not eng_raw:
        return None
    orig_paras = to_paragraphs(strip_boilerplate(orig_raw))
    eng_paras = to_paragraphs(strip_boilerplate(eng_raw))
    if len(orig_paras) < 3 or len(eng_paras) < 3:
        return None

    spreads = build_spreads(orig_paras, eng_paras)
    eng_row = catalog.get(pair["englishId"], {})
    translator = find_translator(eng_row.get("Authors", "")) or "Uncredited"
    author_display = clean_person(pair["author"])
    subjects = pair.get("subjects") or []
    summary = subjects[0] if subjects else f"A {pair['language']} work with a public-domain English translation."

    # The catalog's "Issued" date is the Gutenberg upload date, not the work's
    # composition year, so it is misleading. Use the author's birth year as a
    # rough era anchor instead.
    birth = pair.get("authorBirthYear")
    return {
        "id": pair["id"],
        "title": pair["title"],
        "author": author_display,
        "language": pair["language"],
        "era": "Public domain",
        "place": "",
        "year": birth or 0,
        "source": f"Project Gutenberg #{pair['originalId']} (original) · #{pair['englishId']} (translation)",
        "summary": summary,
        "originalLabel": f"{pair['language']} original",
        "englishLabel": "English translation",
        "originalSource": author_display,
        "englishSource": translator,
        "translator": translator,
        "authorSort": sort_name(pair["author"]),
        "originalId": pair["originalId"],
        "englishId": pair["englishId"],
        "confidence": pair["confidence"],
        "aligned": "auto",
        "spreads": spreads,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=60, help="number of pairs to cache")
    ap.add_argument("--min-confidence", type=float, default=0.6)
    args = ap.parse_args()

    pairs = json.loads(LIBRARY.read_text(encoding="utf-8"))
    pairs = [p for p in pairs if p["confidence"] >= args.min_confidence]
    catalog = load_catalog_index()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    cached_ids: list[str] = []
    attempted = 0
    for pair in pairs:
        if len(cached_ids) >= args.limit:
            break
        attempted += 1
        work = build_work(pair, catalog)
        if not work:
            print(f"  skip {pair['id']} (text unavailable)", file=sys.stderr)
            continue
        (OUT_DIR / f"{pair['id']}.json").write_text(
            json.dumps(work, ensure_ascii=False), encoding="utf-8"
        )
        cached_ids.append(pair["id"])
        print(f"  cached {pair['id']:>16}  {work['title'][:40]!r} ({len(work['spreads'])} openings)")

    MANIFEST.write_text(json.dumps(cached_ids, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"\nCached {len(cached_ids)} works (attempted {attempted}). Manifest -> {MANIFEST.relative_to(REPO)}")


if __name__ == "__main__":
    main()
