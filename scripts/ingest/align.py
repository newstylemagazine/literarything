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


# --- Fine-grained (stanza / numbered-line) anchoring ----------------------
#
# Verse and many numbered editions carry a per-stanza or per-line number that is
# present in *both* editions (e.g. Italian "17" vs English "XVII"). These make
# excellent automatic anchors: matching them lines a stanza up with its exact
# counterpart, where proportional slicing alone drifts. A "unit" is one such
# stanza/paragraph, optionally tagged with its detected number.

_STANDALONE_NUM = re.compile(r"^\d{1,4}$")
_STANDALONE_ROMAN = re.compile(r"^[IVXLCDM]{1,7}$")


def _inline_marker(text: str) -> int | None:
    """Detect a stanza/line number at the very start of a paragraph.

    Accepts a leading arabic number ("17 Cominciar ...") or an *uppercase*
    roman numeral ("XVII Thus ..."). Requiring uppercase for romans avoids
    treating an English sentence that opens with "I" as a stanza marker; stray
    false positives are additionally filtered out by the increasing-run check in
    `_marker_index`.
    """
    head = text.lstrip()
    parts = head.split(None, 1)
    if len(parts) < 2:
        return None
    tok = parts[0].strip(".:)(]")
    if tok.isdigit() and len(tok) <= 4:
        return int(tok)
    if tok and tok == tok.upper() and re.fullmatch(r"[IVXLCDM]+", tok):
        return roman_to_int(tok)
    return None


def _build_units(paragraphs: list[str]) -> list[dict]:
    """Group paragraphs into stanza/line "units", each tagged with a number.

    A paragraph that is *only* a number (arabic or roman) labels the paragraph
    that follows it; the number is folded into that unit's text so both columns
    display it inline. Otherwise the unit's number is read from its leading
    token, if any.
    """
    units: list[dict] = []
    pending: int | None = None
    for p in paragraphs:
        t = p.strip()
        if not t:
            continue
        if _STANDALONE_NUM.fullmatch(t):
            pending = int(t)
            continue
        rom = _STANDALONE_ROMAN.fullmatch(t)
        if rom and roman_to_int(t):
            pending = roman_to_int(t)
            continue
        if pending is not None:
            units.append({"marker": pending, "text": f"{pending} {t}"})
            pending = None
        else:
            units.append({"marker": _inline_marker(t), "text": t})
    return units


def _marker_index(units: list[dict]) -> dict[int, int]:
    """Map each stanza number to its unit index, keeping only an increasing run.

    Greedily discarding any marker not strictly greater than the last kept one
    removes noise (e.g. a paragraph that happens to open with a year) so the two
    sides match on a clean, monotonically increasing sequence.
    """
    idx: dict[int, int] = {}
    last = 0
    for i, u in enumerate(units):
        m = u["marker"]
        if m is not None and m > last:
            idx[m] = i
            last = m
    return idx


def _proportional_pair(o_units: list[dict], e_units: list[dict]) -> list[dict]:
    """Pair two runs of units into rows balanced by count (merge-to-min).

    Mirrors the reader's runtime pairing: equal counts pair 1:1; otherwise the
    shorter side keeps one unit per row and the longer side merges consecutive
    units proportionally, so paragraph starts still correspond generally.
    """
    if not o_units and not e_units:
        return []
    if not o_units:
        return [{"original": "", "english": u["text"]} for u in e_units]
    if not e_units:
        return [{"original": u["text"], "english": ""} for u in o_units]
    n = min(len(o_units), len(e_units))
    rows: list[dict] = []
    for i in range(n):
        o_lo = round(i / n * len(o_units))
        o_hi = round((i + 1) / n * len(o_units))
        e_lo = round(i / n * len(e_units))
        e_hi = round((i + 1) / n * len(e_units))
        rows.append({
            "original": "\n\n".join(u["text"] for u in o_units[o_lo:o_hi]),
            "english": "\n\n".join(u["text"] for u in e_units[e_lo:e_hi]),
        })
    return rows


def _rows_for_segment(orig: list[str], eng: list[str]) -> tuple[list[dict], bool]:
    """Build aligned rows for one segment. Returns (rows, used_markers).

    Anchors on shared stanza/line numbers when both sides expose a strong
    increasing sequence; between anchors (and when no markers exist) it pairs
    proportionally.
    """
    o_units = _build_units(orig)
    e_units = _build_units(eng)
    if not o_units or not e_units:
        return _proportional_pair(o_units, e_units), False

    o_idx = _marker_index(o_units)
    e_idx = _marker_index(e_units)
    shared = sorted(set(o_idx) & set(e_idx))
    strong = len(shared) >= 4 and len(shared) >= 0.5 * min(len(o_units), len(e_units))

    if not strong:
        return _proportional_pair(o_units, e_units), False

    # Walk anchor points (plus the implicit segment start/end), pairing the
    # units between each consecutive pair of anchors proportionally.
    points: list[tuple[int, int]] = [(0, 0)]
    for n in shared:
        pt = (o_idx[n], e_idx[n])
        if pt[0] > points[-1][0] and pt[1] > points[-1][1]:
            points.append(pt)
    points.append((len(o_units), len(e_units)))

    rows: list[dict] = []
    for (o_s, e_s), (o_e, e_e) in zip(points, points[1:]):
        rows.extend(_proportional_pair(o_units[o_s:o_e], e_units[e_s:e_e]))
    return rows, True


def _paginate_rows(rows: list[dict], target: int) -> list[list[dict]]:
    """Group aligned rows into facing-page openings by combined char mass.

    Rows are atomic (never split), so an opening always contains whole aligned
    stanzas/paragraphs and the columns stay anchored across page turns.
    """
    pages: list[list[dict]] = []
    cur: list[dict] = []
    size = 0
    for r in rows:
        cur.append(r)
        size += len(r["original"]) + len(r["english"])
        if size >= target * 2:
            pages.append(cur)
            cur, size = [], 0
    if cur:
        pages.append(cur)
    return pages or [[]]


def _spreads_from_rows(rows: list[dict]) -> list[dict]:
    """Turn aligned rows into spreads, each carrying its explicit row pairing."""
    spreads: list[dict] = []
    for page in _paginate_rows(rows, TARGET_CHARS):
        spreads.append({
            "original": "\n\n".join(r["original"] for r in page if r["original"]),
            "english": "\n\n".join(r["english"] for r in page if r["english"]),
            "rows": page,
        })
    return spreads


def _spreads_for_segment(orig: list[str], eng: list[str]) -> list[dict]:
    rows, _ = _rows_for_segment(orig, eng)
    return _spreads_from_rows(rows)


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
        rows_all: list[dict] = []
        for k, (o_start, e_start) in enumerate(anchors):
            o_end = anchors[k + 1][0] if k + 1 < len(anchors) else len(orig_paras)
            e_end = anchors[k + 1][1] if k + 1 < len(anchors) else len(eng_paras)
            seg_rows, _ = _rows_for_segment(
                orig_paras[o_start:o_end], eng_paras[e_start:e_end]
            )
            rows_all.extend(seg_rows)
        if rows_all:
            return _spreads_from_rows(rows_all), "structural"

    # Fallback: whole-text proportional. The two editions could not be matched
    # segment-by-segment, but if each independently exposes a first division we
    # can still drop the front matter (prefaces, TOC, synopses) that precedes it
    # on each side, so the columns start on the work rather than on paratext.
    method = "proportional"
    if orig_div and eng_div:
        orig_paras = orig_paras[orig_div[0][0]:]
        eng_paras = eng_paras[eng_div[0][0]:]
        method = "proportional+trim"

    rows_all, used_markers = _rows_for_segment(orig_paras, eng_paras)
    # A poem with no chapter/canto divisions can still be anchored stanza by
    # stanza on its line numbers -- that is genuine structural alignment.
    if used_markers and method == "proportional":
        method = "structural"
    return _spreads_from_rows(rows_all), method
