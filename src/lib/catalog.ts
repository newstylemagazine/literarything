import catalogData from "@/data/catalog.json";

/** A single facing-page opening: original text beside its English translation. */
export interface Spread {
  original: string;
  english: string;
}

/** A curated bilingual work with its facing-page content. */
export interface CuratedWork {
  id: string;
  title: string;
  author: string;
  language: string;
  era: string;
  place: string;
  year: number;
  source: string;
  summary: string;
  originalLabel: string;
  englishLabel: string;
  originalSource: string;
  englishSource: string;
  /** Translator of the English edition, surfaced prominently in the reader. */
  translator: string;
  /** Author name inverted for citations, e.g. "Alighieri, Dante". */
  authorSort: string;
  spreads: Spread[];
  /** Provenance for auto-ingested Gutenberg pairs (absent on curated works). */
  originalId?: number;
  englishId?: number;
  /** Pairing confidence in [0,1] for auto-ingested works. */
  confidence?: number;
  /** "manual" for hand-aligned curated works, "auto" for ingested pairs. */
  aligned?: "manual" | "auto";
  /**
   * How an auto-ingested pair was aligned:
   * - "structural": anchored on shared chapter/canto/part headings.
   * - "proportional+trim": front matter dropped, then proportional.
   * - "proportional": whole-text proportional (no shared structure found).
   */
  alignMethod?: "structural" | "proportional+trim" | "proportional";
}

/** Lightweight catalog metadata, safe to ship to the client without the full text. */
export type WorkSummary = Omit<CuratedWork, "spreads"> & {
  spreadCount: number;
};

export const catalog = catalogData as CuratedWork[];

export const languages: string[] = Array.from(
  new Set(catalog.map((work) => work.language)),
).sort();

export function getWork(id: string): CuratedWork | undefined {
  return catalog.find((work) => work.id === id);
}

export function toSummary(work: CuratedWork): WorkSummary {
  const { spreads, ...rest } = work;
  return { ...rest, spreadCount: spreads.length };
}

export function getSummaries(): WorkSummary[] {
  return catalog.map(toSummary);
}
