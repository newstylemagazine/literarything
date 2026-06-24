"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import type { CuratedWork } from "@/lib/catalog";
import { useReaderStore } from "@/lib/store";
import { cn, formatYear } from "@/lib/utils";
import { CitationDialog } from "@/components/CitationDialog";

const FONT_MAP: Record<string, string> = {
  garamond: 'var(--font-serif), "EB Garamond", Garamond, serif',
  georgia: 'Georgia, "Times New Roman", serif',
  palatino: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
};

const FONTS = [
  { key: "garamond", label: "Garamond" },
  { key: "georgia", label: "Georgia" },
  { key: "palatino", label: "Palatino" },
];

const THEMES = [
  { key: "light", label: "Light" },
  { key: "sepia", label: "Sepia" },
  { key: "dark", label: "Dark" },
] as const;

const MIN_FONT = 15;
const MAX_FONT = 28;

interface ReaderProps {
  work: CuratedWork;
}

interface GlossState {
  text: string;
  x: number;
  y: number;
}

function toParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

interface ParaRow {
  original: string;
  english: string;
}

/**
 * Pair the two columns paragraph-by-paragraph so each paragraph's first line
 * faces its counterpart. When both editions have the same number of paragraphs
 * they pair 1:1; when they differ, the shorter side keeps one paragraph per row
 * and the longer side merges consecutive paragraphs proportionally, so the
 * paragraph starts still correspond generally.
 */
function pairParagraphs(original: string[], english: string[]): ParaRow[] {
  if (original.length === 0 && english.length === 0) return [];
  if (original.length === 0)
    return english.map((e) => ({ original: "", english: e }));
  if (english.length === 0)
    return original.map((o) => ({ original: o, english: "" }));

  const rows = Math.min(original.length, english.length);
  const out: ParaRow[] = [];
  for (let i = 0; i < rows; i++) {
    const oLo = Math.round((i / rows) * original.length);
    const oHi = Math.round(((i + 1) / rows) * original.length);
    const eLo = Math.round((i / rows) * english.length);
    const eHi = Math.round(((i + 1) / rows) * english.length);
    out.push({
      original: original.slice(oLo, oHi).join("\n\n"),
      english: english.slice(eLo, eHi).join("\n\n"),
    });
  }
  return out;
}

export function Reader({ work }: ReaderProps) {
  const [mounted, setMounted] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [gloss, setGloss] = useState<GlossState | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showCite, setShowCite] = useState(false);

  const theme = useReaderStore((s) => s.theme);
  const fontSize = useReaderStore((s) => s.fontSize);
  const fontFamily = useReaderStore((s) => s.fontFamily);
  const setTheme = useReaderStore((s) => s.setTheme);
  const setFontSize = useReaderStore((s) => s.setFontSize);
  const setFontFamily = useReaderStore((s) => s.setFontFamily);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageIndexRef = useRef(pageIndex);

  const total = work.spreads.length;
  const spread = work.spreads[pageIndex];

  // Read the deep-linked opening from the URL on mount (static-export safe).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const param = new URLSearchParams(window.location.search).get("page");
      const parsed = Number.parseInt(param ?? "", 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= work.spreads.length) {
        setPageIndex(parsed - 1);
      }
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [work.spreads.length]);

  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  // Keep the URL in sync so any opening is shareable / deep-linkable.
  useEffect(() => {
    if (!mounted) return;
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(pageIndex + 1));
    window.history.replaceState(null, "", url.toString());
  }, [pageIndex, mounted]);

  const goTo = useCallback(
    (next: number) => {
      setPageIndex((current) => {
        const target = Math.min(Math.max(next, 0), total - 1);
        if (target !== current) {
          setGloss(null);
          scrollRef.current?.scrollTo({ top: 0 });
        }
        return target;
      });
    },
    [total],
  );

  // Arrow-key navigation, like flipping pages.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight") goTo(pageIndexRef.current + 1);
      if (event.key === "ArrowLeft") goTo(pageIndexRef.current - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!selection || selection.rangeCount === 0 || text.length === 0) {
      setGloss(null);
      return;
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    setGloss({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if ((event.target as HTMLElement)?.closest?.("[data-gloss-popup]")) return;
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setGloss(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const effectiveTheme = mounted ? theme : "light";
  const effectiveFontSize = mounted ? fontSize : 19;
  const effectiveFont = mounted ? fontFamily : "garamond";

  const isDark = effectiveTheme === "dark";

  const originalParagraphs = useMemo(
    () => toParagraphs(spread.original),
    [spread.original],
  );
  const englishParagraphs = useMemo(
    () => toParagraphs(spread.english),
    [spread.english],
  );
  // Prefer the build-time anchored pairing (verse stanza/line numbers, chapter
  // structure); fall back to runtime proportional pairing for curated works.
  const rows = useMemo(
    () =>
      spread.rows && spread.rows.length > 0
        ? spread.rows
        : pairParagraphs(originalParagraphs, englishParagraphs),
    [spread.rows, originalParagraphs, englishParagraphs],
  );

  async function exportPdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 54;
      const gutter = 28;
      const colW = (pageW - margin * 2 - gutter) / 2;

      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.text(work.title, margin, margin);
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.text(
        `${work.author} · Opening ${pageIndex + 1} of ${total}`,
        margin,
        margin + 16,
      );

      const top = margin + 44;
      const drawColumn = (
        x: number,
        label: string,
        paragraphs: string[],
      ) => {
        doc.setFont("times", "bold");
        doc.setFontSize(8);
        doc.text(label.toUpperCase(), x, top);
        doc.setFont("times", "normal");
        doc.setFontSize(11);
        let y = top + 18;
        const maxY = pageH - margin;
        const indent = 14;
        paragraphs.forEach((para, paraIndex) => {
          const offset = paraIndex === 0 ? 0 : indent;
          const lines = doc.splitTextToSize(para, colW - offset) as string[];
          lines.forEach((line, lineIndex) => {
            if (y > maxY) return;
            doc.text(line, x + (lineIndex === 0 ? offset : 0), y);
            y += 15;
          });
          y += 8;
        });
      };

      drawColumn(margin, work.originalLabel, originalParagraphs);
      drawColumn(margin + colW + gutter, work.englishLabel, englishParagraphs);

      doc.save(
        `${work.id}-opening-${pageIndex + 1}.pdf`.replace(/[^a-z0-9.-]/gi, "-"),
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      className={cn(
        "reader-surface flex min-h-screen flex-col",
        isDark ? "dark bg-night" : "bg-paper",
      )}
      data-theme={effectiveTheme}
    >
      {/* Reader chrome */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b backdrop-blur-md",
          isDark
            ? "border-night-line bg-night/85"
            : "border-line/70 bg-paper/85",
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/catalog"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                isDark
                  ? "border-night-line text-night-soft hover:text-night-ink"
                  : "border-line text-ink-soft hover:text-ink",
              )}
              aria-label="Back to library"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate font-serif text-lg font-semibold leading-tight",
                  isDark ? "text-night-ink" : "text-ink",
                )}
              >
                {work.title}
              </p>
              <p
                className={cn(
                  "truncate text-xs",
                  isDark ? "text-night-soft" : "text-ink-soft",
                )}
              >
                {work.author} · {work.language}–English · {formatYear(work.year)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCite(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                isDark
                  ? "border-night-line text-night-ink hover:border-night-soft"
                  : "border-line-strong text-ink hover:border-ink-faint",
              )}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
              >
                <path
                  d="M7 7H5.5A1.5 1.5 0 0 0 4 8.5v2A1.5 1.5 0 0 0 5.5 12H7V8c0-.6.2-1 .5-1.4M14.5 7H13a1.5 1.5 0 0 0-1.5 1.5v2A1.5 1.5 0 0 0 13 12h1.5V8c0-.6.2-1 .5-1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Cite
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
              >
                <path
                  d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {exporting ? "Preparing…" : "PDF"}
            </button>
          </div>
        </div>

        {/* Settings */}
        <div
          className={cn(
            "border-t",
            isDark ? "border-night-line/70" : "border-line/60",
          )}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 text-sm sm:px-6">
            <ControlGroup label="Size" dark={isDark}>
              <ControlButton
                dark={isDark}
                onClick={() => setFontSize(Math.max(MIN_FONT, fontSize - 1))}
                ariaLabel="Decrease text size"
              >
                A&minus;
              </ControlButton>
              <span
                className={cn(
                  "w-6 text-center tabular-nums",
                  isDark ? "text-night-soft" : "text-ink-soft",
                )}
              >
                {effectiveFontSize}
              </span>
              <ControlButton
                dark={isDark}
                onClick={() => setFontSize(Math.min(MAX_FONT, fontSize + 1))}
                ariaLabel="Increase text size"
              >
                A+
              </ControlButton>
            </ControlGroup>

            <ControlGroup label="Type" dark={isDark}>
              {FONTS.map((font) => (
                <ControlButton
                  key={font.key}
                  dark={isDark}
                  active={effectiveFont === font.key}
                  onClick={() => setFontFamily(font.key)}
                >
                  {font.label}
                </ControlButton>
              ))}
            </ControlGroup>

            <ControlGroup label="Theme" dark={isDark}>
              {THEMES.map((t) => (
                <ControlButton
                  key={t.key}
                  dark={isDark}
                  active={effectiveTheme === t.key}
                  onClick={() => setTheme(t.key)}
                >
                  {t.label}
                </ControlButton>
              ))}
            </ControlGroup>
          </div>
        </div>
      </header>

      {/* The book */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div
          className="overflow-hidden rounded-xl shadow-book ring-1 ring-black/5"
          onMouseUp={handleSelection}
        >
          {/* Column headers */}
          <div
            className="reader-page grid md:grid-cols-2"
            style={{ color: "var(--page-muted)" }}
          >
            <div
              className="flex items-start justify-between border-b px-6 pb-3 pt-6 sm:px-9 md:border-b-0 md:border-r"
              style={{ borderColor: "var(--page-line)" }}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em]">
                {work.originalLabel}
              </span>
              <span className="shrink-0 text-[11px] uppercase tracking-[0.12em]">
                {work.language}
              </span>
            </div>
            <div
              className="flex items-start justify-between border-b px-6 pb-3 pt-6 sm:px-9"
              style={{ borderColor: "var(--page-line)" }}
            >
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {work.englishLabel}
                </span>
                <span
                  className="mt-0.5 block truncate font-serif text-sm italic"
                  style={{ color: "var(--page-ink)" }}
                >
                  Translated by {work.translator}
                </span>
              </div>
              <span className="shrink-0 text-[11px] uppercase tracking-[0.12em]">
                English
              </span>
            </div>
          </div>

          {/* Paragraph-paired body: each paragraph's first line faces its
              translation, in one shared scroll so the columns stay aligned. */}
          <div
            ref={scrollRef}
            className="reader-page max-h-[58vh] overflow-y-auto"
            style={{
              fontFamily: FONT_MAP[effectiveFont] ?? FONT_MAP.garamond,
              fontSize: effectiveFontSize,
              lineHeight: 1.7,
            }}
          >
            <div className="relative grid py-5 sm:py-6 md:grid-cols-2">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px md:block"
                style={{ background: "var(--page-line)" }}
              />
              {rows.map((row, index) => (
                <Fragment key={index}>
                  <ParaCell side="verso" text={row.original} first={index === 0} />
                  <ParaCell side="recto" text={row.english} first={index === 0} />
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="mx-auto mt-6 flex max-w-xl items-center justify-between gap-4">
          <PageNavButton
            dark={isDark}
            onClick={() => goTo(pageIndex - 1)}
            disabled={pageIndex === 0}
            direction="prev"
          />
          <div className="flex-1 text-center">
            <p
              className={cn(
                "text-sm font-medium",
                isDark ? "text-night-ink" : "text-ink",
              )}
            >
              Opening {pageIndex + 1}{" "}
              <span className={isDark ? "text-night-soft" : "text-ink-faint"}>
                / {total}
              </span>
            </p>
            <div
              className={cn(
                "mx-auto mt-2 h-1 w-full max-w-xs overflow-hidden rounded-full",
                isDark ? "bg-night-line" : "bg-line",
              )}
            >
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${((pageIndex + 1) / total) * 100}%` }}
              />
            </div>
          </div>
          <PageNavButton
            dark={isDark}
            onClick={() => goTo(pageIndex + 1)}
            disabled={pageIndex === total - 1}
            direction="next"
          />
        </div>

        <div
          className={cn(
            "mx-auto mt-8 max-w-xl rounded-xl border p-5",
            isDark
              ? "border-night-line bg-night-card/60"
              : "border-line bg-paper-card/70",
          )}
        >
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.16em]",
              isDark ? "text-night-soft" : "text-ink-faint",
            )}
          >
            About this edition
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[7rem_1fr]">
            <EditionRow dark={isDark} term="Translator" emphasize>
              {work.translator}
            </EditionRow>
            <EditionRow dark={isDark} term="Original">
              {work.originalSource}
            </EditionRow>
            <EditionRow dark={isDark} term="Source">
              {work.originalId && work.englishId ? (
                <>
                  Project Gutenberg{" "}
                  <a
                    href={`https://www.gutenberg.org/ebooks/${work.originalId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-2 hover:text-accent"
                  >
                    #{work.originalId}
                  </a>{" "}
                  ·{" "}
                  <a
                    href={`https://www.gutenberg.org/ebooks/${work.englishId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-2 hover:text-accent"
                  >
                    #{work.englishId}
                  </a>
                </>
              ) : (
                work.source
              )}
            </EditionRow>
            {work.aligned === "auto" && (
              <EditionRow dark={isDark} term="Alignment">
                {work.alignMethod === "structural"
                  ? "Auto-aligned (beta) — anchored on shared chapter/canto headings; pages track proportionally within each chapter."
                  : work.alignMethod === "proportional+trim"
                    ? "Auto-aligned (beta) — front matter removed, then facing pages track proportionally."
                    : "Auto-aligned (beta) — facing pages track proportionally, not yet line-by-line."}
              </EditionRow>
            )}
          </dl>
        </div>
      </main>

      {showCite && (
        <CitationDialog
          work={work}
          dark={isDark}
          onClose={() => setShowCite(false)}
        />
      )}

      {/* Gloss popup — placeholder for future word-by-word glossing */}
      {gloss && (
        <div
          data-gloss-popup
          className="fixed z-50 w-60 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-paper-card p-3 shadow-card"
          style={{ left: gloss.x, top: gloss.y - 8 }}
        >
          <p className="font-serif text-base font-semibold text-ink">
            “{gloss.text.length > 40 ? `${gloss.text.slice(0, 40)}…` : gloss.text}”
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Word-by-word glossing and morphology are coming soon.
          </p>
        </div>
      )}
    </div>
  );
}

const ParaCell = ({
  side,
  text,
  first,
}: {
  side: "verso" | "recto";
  text: string;
  first: boolean;
}) => {
  const paras = toParagraphs(text);
  return (
    <div className={cn("px-6 sm:px-9", side === "verso" ? "md:pr-9" : "")}>
      {paras.length === 0 ? (
        <p className="mb-[0.9em] last:mb-0" aria-hidden>
          &nbsp;
        </p>
      ) : (
        paras.map((para, index) => (
          <p
            key={index}
            className="mb-[0.9em] last:mb-0"
            style={{
              textAlign: "justify",
              hyphens: "auto",
              textIndent: first && index === 0 ? 0 : "1.6em",
            }}
          >
            {para}
          </p>
        ))
      )}
    </div>
  );
};
ParaCell.displayName = "ParaCell";

function EditionRow({
  term,
  dark,
  emphasize,
  children,
}: {
  term: string;
  dark: boolean;
  emphasize?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wider sm:pt-0.5",
          dark ? "text-night-soft" : "text-ink-faint",
        )}
      >
        {term}
      </dt>
      <dd
        className={cn(
          emphasize
            ? cn("font-serif text-base", dark ? "text-night-ink" : "text-ink")
            : dark
              ? "text-night-soft"
              : "text-ink-soft",
        )}
      >
        {children}
      </dd>
    </>
  );
}

function ControlGroup({
  label,
  dark,
  children,
}: {
  label: string;
  dark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wider",
          dark ? "text-night-soft" : "text-ink-faint",
        )}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  active,
  dark,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  dark: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-paper"
          : dark
            ? "text-night-soft hover:bg-night-card hover:text-night-ink"
            : "text-ink-soft hover:bg-paper-deep hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function PageNavButton({
  onClick,
  disabled,
  direction,
  dark,
}: {
  onClick: () => void;
  disabled: boolean;
  direction: "prev" | "next";
  dark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        dark
          ? "border-night-line text-night-ink hover:border-night-soft"
          : "border-line-strong text-ink hover:border-ink-faint",
      )}
    >
      {direction === "prev" ? (
        <>
          <Chevron dir="left" /> Prev
        </>
      ) : (
        <>
          Next <Chevron dir="right" />
        </>
      )}
    </button>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d={dir === "left" ? "M12 4 6 10l6 6" : "M8 4l6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
