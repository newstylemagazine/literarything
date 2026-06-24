#!/usr/bin/env python3
"""Structure-aware alignment for paired Gutenberg texts.

The naive aligner splits both editions proportionally by character count, which
drifts badly whenever one edition carries editorial paratext the other lacks
(translator prefaces, plot synopses, tables of contents, transcriber notes).

This module:
  1. Strips front/back matter so both editions begin at the actual work.
  2. Detects division headings (chapter/canto/book/part/act ...) in *both*
     editions across languages and numeral styles, then aligns segment by
     segment so e.g. Canto 12 always faces Canto 12. Proportional splitting
     only happens *within* a matched segment.
  3. Falls back to whole-text proportional alignment when no reliable shared
     structure exists, so output is never worse than before.

The matching is deliberately language-agnostic: it anchors on the *numeric
ordinal* of each heading when parseable (arabic/roman/spelled), and otherwise
on the *order of appearance* (index) when both editions expose the same number
of divisions. Keyword words themselves differ by language and are only used to
pick a consistent division level.
"""
from __future__ import annotations

import re

TARGET_CHARS = 1500  # approx original characters per facing-page opening

# --- Division keywords grouped by structural level (synonyms across languages).
# Picking a *level* (not a literal word) lets us align an Italian "CANTO" with an
# English "CANTO", or a French "CHAPITRE" with an English "CHAPTER".
LEVEL_KEYWORDS: dict[str, set[str]] = {
    "canto": {"canto", "chant", "gesang", "zang", "cantica"},
    "book": {"book", "livre", "libro", "buch", "boek", "kirja", "liber", "tomo"},
    "part": {"part", "partie", "parte", "teil", "deel", "osa", "del"},
    "chapter": {
        "chapter", "chapitre", "capitolo", "capítulo", "capitulo", "kapitel",
        "capitel", "hoofdstuk", "luku", "glava", "kapittel", "kapitola",
        "caput", "hricka",
    },
    "act": {"act", "acte", "atto", "akt", "näytös", "naytos", "aufzug", "bedrijf"},
    "scene": {"scene", "scène", "scena", "szene", "kohtaus", "tooneel"},
    "letter": {"letter", "lettre", "lettera", "carta", "brief"},
}
KEYWORD_LEVEL: dict[str, str] = {
    w: level for level, words in LEVEL_KEYWORDS.items() for w in words
}
_ALL_KEYWORDS = sorted(KEYWORD_LEVEL, key=len, reverse=True)
_KW_ALT = "|".join(re.escape(w) for w in _ALL_KEYWORDS)

# Spelled-out ordinals (1-30 plus tens) across the languages we ingest. Only a
# bonus: when these parse, number-matching becomes robust to a missing division;
# when they don't, we still fall back to index-matching.
_SPELLED: dict[str, int] = {}


def _add(words: str, n: int) -> None:
    for w in words.split():
        _SPELLED[w] = n


# English
for i, w in enumerate(
    "first second third fourth fifth sixth seventh eighth ninth tenth eleventh "
    "twelfth thirteenth fourteenth fifteenth sixteenth seventeenth eighteenth "
    "nineteenth twentieth".split(), start=1):
    _SPELLED[w] = i
# Italian
for i, w in enumerate(
    "primo secondo terzo quarto quinto sesto settimo ottavo nono decimo "
    "undicesimo dodicesimo tredicesimo quattordicesimo quindicesimo sedicesimo "
    "diciassettesimo diciottesimo diciannovesimo ventesimo".split(), start=1):
    _SPELLED[w] = i
    _SPELLED[w[:-1] + "a"] = i  # feminine (prima, seconda, ...)
# French
for i, w in enumerate(
    "premier deuxième troisième quatrième cinquième sixième septième huitième "
    "neuvième dixième onzième douzième treizième quatorzième quinzième seizième "
    "dix-septième dix-huitième dix-neuvième vingtième".split(), start=1):
    _SPELLED[w] = i
_SPELLED["première"] = 1
_SPELLED["second"] = 2
_SPELLED["seconde"] = 2
# Spanish
for i, w in enumerate(
    "primero segundo tercero cuarto quinto sexto séptimo octavo noveno décimo "
    "undécimo duodécimo".split(), start=1):
    _SPELLED[w] = i
    _SPELLED[w.rstrip("o") + "a"] = i
_SPELLED["primera"] = 1
# German (ordinal stems; we match a leading stem so endings -es/-e/-en all work)
_GERMAN_STEMS = [
    "erst", "zweit", "dritt", "viert", "fünft", "funft", "sechst", "siebt",
    "siebent", "acht", "neunt", "zehnt", "elft", "zwölft", "zwolft",
    "dreizehnt", "vierzehnt", "fünfzehnt", "funfzehnt", "sechzehnt",
    "siebzehnt", "achtzehnt", "neunzehnt", "zwanzigst",
]

ROMAN_RE = re.compile(r"^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$", re.I)


def roman_to_int(s: str) -> int | None:
    s = s.upper()
    if not s or not ROMAN_RE.match(s):
        return None
    vals = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    prev = 0
    for ch in reversed(s):
        v = vals[ch]
        total += -v if v < prev else v
        prev = max(prev, v)
    return total or None


def _spelled_to_int(token: str) -> int | None:
    t = token.lower().strip(".")
    if t in _SPELLED:
        return _SPELLED[t]
    for i, stem in enumerate(_GERMAN_STEMS, start=1):
        if t.startswith(stem):
            return i
    return None


def parse_ordinal(token: str) -> int | None:
    """Parse an arabic, roman, or spelled-out ordinal token to an int."""
    token = token.strip().strip(".:)")
    if not token:
        return None
    if token.isdigit():
        return int(token)
    r = roman_to_int(token)
    if r is not None:
        return r
    return _spelled_to_int(token)


# A heading line: keyword + ordinal, ordinal + keyword, or "N. keyword".
_KW_FIRST = re.compile(rf"^({_KW_ALT})\b[\s.:)]*([\w\-]+)", re.I)
_KW_LAST = re.compile(rf"^([\w\-]+)\.?\s+({_KW_ALT})\b", re.I)
# A TOC entry trails a page number set off by dot leaders or a wide gap, e.g.
# "Chapter V.--Magie en Grece .... 85" or "1. Kapitel        3". The gap before
# the number is what distinguishes it from a heading's own ordinal ("CANTO 1").
_TOC_TAIL = re.compile(r"(\.{2,}|\s{3,})\d{1,4}\s*$")


def heading_info(paragraph: str) -> tuple[str, int | None] | None:
    """Return (level, ordinal|None) if `paragraph` is a division heading.

    Rejects table-of-contents entries (a page number set off by leaders/gap) and
    over-long paragraphs (real headings are short, isolated lines).
    """
    text = paragraph.strip()
    if not text or len(text) > 90 or "\n" in text:
        return None
    if _TOC_TAIL.search(text):  # "Chapter V .... 85" -> TOC entry
        return None

    m = _KW_FIRST.match(text)
    if m:
        level = KEYWORD_LEVEL.get(m.group(1).lower())
        if level:
            return level, parse_ordinal(m.group(2))
    m = _KW_LAST.match(text)
    if m:
        level = KEYWORD_LEVEL.get(m.group(2).lower())
        if level:
            return level, parse_ordinal(m.group(1))
    return None


def find_divisions(paragraphs: list[str]) -> list[tuple[int, int | None]]:
    """Locate body division headings at the dominant structural level.

    Returns [(paragraph_index, ordinal|None), ...] in document order.
    """
    hits: list[tuple[int, str, int | None]] = []
    for i, p in enumerate(paragraphs):
        info = heading_info(p)
        if info:
            hits.append((i, info[0], info[1]))
    if not hits:
        return []
    # Pick the most frequent level (e.g. CHAPTER over the few BOOK lines).
    counts: dict[str, int] = {}
    for _, level, _ in hits:
        counts[level] = counts.get(level, 0) + 1
    dominant = max(counts, key=lambda k: counts[k])
    return [(i, ordv) for i, level, ordv in hits if level == dominant]


def _to_paragraphs_already(paras: list[str]) -> list[str]:
    return [p for p in paras if p.strip()]


def _paginate(paragraphs: list[str], target: int) -> list[list[str]]:
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


def _slice_proportional(paragraphs: list[str], n_pages: int) -> list[list[str]]:
    """Split paragraphs into n_pages chunks balanced by character count.

    Slicing by character mass (rather than paragraph index) keeps the two
    columns reading the same moment: a page that is a short heading on one side
    no longer absorbs a whole proportional share of the other side.
    """
    if n_pages <= 1:
        return [paragraphs]
    total = sum(len(p) for p in paragraphs) or 1
    out: list[list[str]] = []
    cur: list[str] = []
    acc = 0
    page = 0
    for p in paragraphs:
        cur.append(p)
        acc += len(p)
        # Close the page once we've accumulated this page's char-share, while
        # leaving enough paragraphs for the remaining pages.
        boundary = (page + 1) / n_pages * total
        remaining_pages = n_pages - len(out)
        if acc >= boundary and len(cur) >= 1 and remaining_pages > 1:
            out.append(cur)
            cur = []
            page += 1
    if cur:
        out.append(cur)
    while len(out) < n_pages:
        out.append([])
    return out


def _spreads_for_segment(orig: list[str], eng: list[str]) -> list[dict]:
    orig_pages = _paginate(orig, TARGET_CHARS)
    eng_pages = _slice_proportional(eng, len(orig_pages))
    return [
        {"original": "\n\n".join(o), "english": "\n\n".join(e)}
        for o, e in zip(orig_pages, eng_pages)
    ]


def _match_segments(
    orig_div: list[tuple[int, int | None]],
    eng_div: list[tuple[int, int | None]],
) -> list[tuple[int, int]] | None:
    """Return aligned (orig_para_index, eng_para_index) anchor pairs, or None.

    Strategy A (preferred): both ordinal sequences are strictly increasing and
    share >=3 ordinals -> match on the shared ordinals (robust to a missing or
    extra division on either side).
    Strategy B: same division count on both sides (>=3) -> match by appearance
    index (works when ordinals are spelled/reset/unparseable).
    """
    o_ord = [o for _, o in orig_div]
    e_ord = [o for _, o in eng_div]

    def strictly_increasing(xs: list[int | None]) -> bool:
        nums = [x for x in xs if x is not None]
        return len(nums) >= 3 and all(a < b for a, b in zip(nums, nums[1:]))

    # Strategy B (full coverage): both editions expose the same number of
    # divisions -> align by appearance order. Reliable for genuine translation
    # pairs and language-agnostic (handles spelled/reset/unparseable ordinals).
    if len(orig_div) == len(eng_div) and len(orig_div) >= 3:
        return [(orig_div[i][0], eng_div[i][0]) for i in range(len(orig_div))]

    # Strategy A: counts differ but both ordinal sequences increase strictly and
    # share >=3 ordinals -> anchor on the shared ordinals (tolerates a missing
    # or extra division on either side).
    if strictly_increasing(o_ord) and strictly_increasing(e_ord):
        o_map = {o: idx for idx, o in orig_div if o is not None}
        e_map = {o: idx for idx, o in eng_div if o is not None}
        shared = sorted(set(o_map) & set(e_map))
        if len(shared) >= 3:
            return [(o_map[n], e_map[n]) for n in shared]

    return None


def build_spreads(orig_paras: list[str], eng_paras: list[str]) -> tuple[list[dict], str]:
    """Build facing-page spreads. Returns (spreads, method).

    method is "structural" when shared chapter/canto structure was used (front
    matter dropped, segments aligned), else "proportional".
    """
    orig_paras = _to_paragraphs_already(orig_paras)
    eng_paras = _to_paragraphs_already(eng_paras)

    orig_div = find_divisions(orig_paras)
    eng_div = find_divisions(eng_paras)

    # Trust a division set only when its first heading sits near the front. This
    # rejects false positives clustered in back matter (indexes, appendices,
    # footnotes that mention "chapter ..."), which would otherwise cause us to
    # discard the whole work and keep only the tail.
    def starts_in_front(div: list[tuple[int, int | None]], n: int) -> bool:
        return bool(div) and div[0][0] <= 0.30 * n

    if not starts_in_front(orig_div, len(orig_paras)):
        orig_div = []
    if not starts_in_front(eng_div, len(eng_paras)):
        eng_div = []

    anchors = _match_segments(orig_div, eng_div) if orig_div and eng_div else None

    if anchors:
        spreads: list[dict] = []
        for k, (o_start, e_start) in enumerate(anchors):
            o_end = anchors[k + 1][0] if k + 1 < len(anchors) else len(orig_paras)
            e_end = anchors[k + 1][1] if k + 1 < len(anchors) else len(eng_paras)
            spreads.extend(
                _spreads_for_segment(orig_paras[o_start:o_end], eng_paras[e_start:e_end])
            )
        if spreads:
            return spreads, "structural"

    # Fallback: whole-text proportional. The two editions could not be matched
    # segment-by-segment, but if each independently exposes a first division we
    # can still drop the front matter (prefaces, TOC, synopses) that precedes it
    # on each side, so the columns start on the work rather than on paratext.
    method = "proportional"
    if orig_div and eng_div:
        orig_paras = orig_paras[orig_div[0][0]:]
        eng_paras = eng_paras[eng_div[0][0]:]
        method = "proportional+trim"
    return _spreads_for_segment(orig_paras, eng_paras), method
