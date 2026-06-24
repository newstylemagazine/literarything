"use client";

import { useEffect, useMemo, useState } from "react";
import type { CuratedWork } from "@/lib/catalog";
import { buildCitations, type CitationStyle } from "@/lib/citation";
import { cn } from "@/lib/utils";

const STYLES: { key: CitationStyle; label: string }[] = [
  { key: "chicago", label: "Chicago" },
  { key: "mla", label: "MLA" },
  { key: "apa", label: "APA" },
];

interface CitationDialogProps {
  work: CuratedWork;
  dark: boolean;
  onClose: () => void;
}

export function CitationDialog({ work, dark, onClose }: CitationDialogProps) {
  const [style, setStyle] = useState<CitationStyle>("chicago");
  const [copied, setCopied] = useState(false);

  const citations = useMemo(() => {
    const url =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}${window.location.pathname}`;
    return buildCitations({ work, url });
  }, [work]);

  const current = citations[style];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function selectStyle(next: CitationStyle) {
    setStyle(next);
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cite this edition"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-2xl border p-6 shadow-card",
          dark
            ? "border-night-line bg-night-card text-night-ink"
            : "border-line bg-paper-card text-ink",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold">Cite this edition</h2>
            <p
              className={cn(
                "mt-1 text-sm",
                dark ? "text-night-soft" : "text-ink-soft",
              )}
            >
              {work.title} · trans. {work.translator}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
              dark
                ? "border-night-line text-night-soft hover:text-night-ink"
                : "border-line text-ink-soft hover:text-ink",
            )}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                d="M5 5l10 10M15 5L5 15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div
          className={cn(
            "mt-4 inline-flex rounded-full border p-0.5",
            dark ? "border-night-line" : "border-line",
          )}
        >
          {STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => selectStyle(s.key)}
              aria-pressed={style === s.key}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                style === s.key
                  ? "bg-accent text-paper"
                  : dark
                    ? "text-night-soft hover:text-night-ink"
                    : "text-ink-soft hover:text-ink",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p
          className={cn(
            "mt-4 rounded-lg border p-4 font-serif text-[15px] leading-relaxed",
            dark
              ? "border-night-line bg-night/40"
              : "border-line bg-paper-deep/60",
          )}
        >
          {current}
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
            >
              {copied ? (
                <path
                  d="M5 10.5 8.5 14 15 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <>
                  <rect x="7" y="7" width="9" height="9" rx="1.5" />
                  <path d="M4 13V5a1 1 0 0 1 1-1h8" strokeLinecap="round" />
                </>
              )}
            </svg>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
