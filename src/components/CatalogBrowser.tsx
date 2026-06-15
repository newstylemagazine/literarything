"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { WorkSummary } from "@/lib/catalog";
import { formatYear } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CatalogBrowserProps {
  works: WorkSummary[];
  languages: string[];
}

export function CatalogBrowser({ works, languages }: CatalogBrowserProps) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("All");

  const filters = ["All", ...languages];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return works.filter((work) => {
      const matchesLanguage = language === "All" || work.language === language;
      const matchesQuery =
        q === "" ||
        work.title.toLowerCase().includes(q) ||
        work.author.toLowerCase().includes(q) ||
        work.era.toLowerCase().includes(q) ||
        work.summary.toLowerCase().includes(q);
      return matchesLanguage && matchesQuery;
    });
  }, [works, query, language]);

  return (
    <div className="mt-8">
      {/* Controls */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, author, era…"
            aria-label="Search the library"
            className="w-full rounded-full border border-line bg-paper-card py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setLanguage(filter)}
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
        {filtered.length} {filtered.length === 1 ? "edition" : "editions"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-line bg-paper-card p-12 text-center">
          <p className="font-serif text-xl text-ink">No editions found</p>
          <p className="mt-2 text-sm text-ink-soft">
            Try a different search or language filter.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((work) => (
            <Link
              key={work.id}
              href={`/reader/${work.id}`}
              className="group flex flex-col rounded-lg border border-line bg-paper-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-paper-deep px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  {work.language}
                </span>
                <span className="text-xs text-ink-faint">
                  {formatYear(work.year)}
                </span>
              </div>
              <h3 className="mt-4 font-serif text-2xl font-semibold leading-tight text-ink transition-colors group-hover:text-accent">
                {work.title}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">{work.author}</p>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-soft">
                {work.summary}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-4 text-xs text-ink-faint">
                <span>{work.era}</span>
                <span>
                  {work.spreadCount}{" "}
                  {work.spreadCount === 1 ? "opening" : "openings"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
