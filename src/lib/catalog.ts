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
  spreads: Spread[];
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
