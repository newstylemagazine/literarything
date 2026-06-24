"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BrowseItem } from "@/lib/library";
import { formatYear } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CatalogBrowserProps {
  works: BrowseItem[];
  languages: string[];
}

const PAGE_SIZE = 24;

export function CatalogBrowser({ works, languages }: CatalogBrowserProps) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("All");
  const [readableOnly, setReadableOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filters = ["All", ...languages];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return works.filter((work) => {
      const matchesLanguage = language === "All" || work.language === language;
      const matchesReadable = !readableOnly || work.readable;
      const matchesQuery =
        q === "" ||
        work.title.toLowerCase().includes(q) ||
        work.author.toLowerCase().includes(q) ||
        work.summary.toLowerCase().includes(q);
      return matchesLanguage && matchesReadable && matchesQuery;
    });
  }, [works, query, language, readableOnly]);

  const shown = filtered.slice(0, visible);

  // Reset pagination whenever filters change.
  const resetVisible = () => setVisible(PAGE_SIZE);

  return (
    <div className="mt-8">
      {/* Controls */}
      <div className="flex flex-col gap-4 border-b border-line pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m17 17-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetVisible();
              }}
              placeholder="Search by title, author, subject…"
              aria-label="Search the library"
              className="w-full rounded-full border border-line bg-paper-card py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={readableOnly}
              onChange={(event) => {
                setReadableOnly(event.target.checked);
                resetVisible();
              }}
              className="h-4 w-4 rounded border-line accent-accent"
            />
            Readable on-site only
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setLanguage(filter);
                resetVisible();
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                language === filter
                  ? "bg-accent text-paper"
                  : "border border-line bg-paper-card text-ink-soft hover:border-line-strong hover:text-ink",
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <p className="mt-5 text-sm text-ink-faint">
        {filtered.length.toLocaleString()}{" "}
        {filtered.length === 1 ? "edition" : "editions"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-line bg-paper-card p-12 text-center">
          <p className="font-serif text-xl text-ink">No editions found</p>
          <p className="mt-2 text-sm text-ink-soft">
            Try a different search or language filter.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((work) => (
              <CatalogCard key={work.id} work={work} />
            ))}
          </div>

          {visible < filtered.length && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-full border border-line-strong bg-paper-card px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-faint"
              >
                Show more ({(filtered.length - visible).toLocaleString()} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CatalogCard({ work }: { work: BrowseItem }) {
  const href = work.readable
    ? `/reader/${work.id}`
    : `https://www.gutenberg.org/ebooks/${work.originalId}`;
  const external = !work.readable;

  return (
    <Link
      key={work.id}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group flex flex-col rounded-lg border border-line bg-paper-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-paper-deep px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
          {work.language}
        </span>
        {work.featured ? (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            Featured
          </span>
        ) : work.readable ? (
          <span className="text-xs text-ink-faint">Readable</span>
        ) : (
          <span className="text-xs text-ink-faint">On Gutenberg ↗</span>
        )}
      </div>
      <h3 className="mt-4 font-serif text-2xl font-semibold leading-tight text-ink transition-colors group-hover:text-accent">
        {work.title}
      </h3>
      <p className="mt-1 text-sm text-ink-soft">{work.author}</p>
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-soft">
        {work.summary}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-4 text-xs text-ink-faint">
        <span>{work.year ? formatYear(work.year) : "Public domain"}</span>
        <span>
          {work.featured
            ? "Hand-aligned"
            : work.readable
              ? "Auto-aligned"
              : "Discover"}
        </span>
      </div>
    </Link>
  );
}
