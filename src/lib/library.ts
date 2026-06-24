import libraryData from "@/data/library.json";
import cachedIds from "@/data/cached-texts.json";
import { catalog, type CuratedWork } from "@/lib/catalog";

/**
 * A bilingual pair detected from Project Gutenberg's catalog: a non-English
 * original and the English translation of the same work. Metadata only — the
 * full text lives in `public/texts/<id>.json` once cached.
 */
export interface LibraryPair {
  id: string;
  originalId: number;
  englishId: number;
  title: string;
  englishTitle: string;
  /** Raw catalog author identity, e.g. "Balzac, Honoré de, 1799-1850". */
  author: string;
  authorBirthYear: number | null;
  languageCode: string;
  language: string;
  year: number | null;
  hasTranslatorCredit: boolean;
  confidence: number;
  subjects: string[];
}

/** A unified browse card spanning curated works and ingested Gutenberg pairs. */
export interface BrowseItem {
  id: string;
  title: string;
  author: string;
  language: string;
  year: number;
  summary: string;
  /** Full text available on-site (curated, or cached from Gutenberg). */
  readable: boolean;
  /** Hand-curated, manually aligned showcase edition. */
  featured: boolean;
  confidence?: number;
  originalId?: number;
  englishId?: number;
}

export const libraryPairs = libraryData as LibraryPair[];

const cachedTextIds = new Set(cachedIds as string[]);

export function isReadable(id: string): boolean {
  return cachedTextIds.has(id);
}

const DATE_TAIL = /,?\s*\d{3,4}\??\s*(BCE|BC)?\s*-\s*\d{0,4}\??\s*(BCE|BC)?\s*$/;

/** "Balzac, Honoré de, 1799-1850" -> "Honoré de Balzac"; "Voltaire, …" -> "Voltaire". */
export function displayAuthor(rawAuthor: string): string {
  const name = rawAuthor.replace(DATE_TAIL, "").trim().replace(/,$/, "");
  const comma = name.indexOf(",");
  if (comma === -1) return name;
  const surname = name.slice(0, comma).trim();
  const given = name.slice(comma + 1).trim();
  return given ? `${given} ${surname}` : surname;
}

function curatedToBrowse(work: CuratedWork): BrowseItem {
  return {
    id: work.id,
    title: work.title,
    author: work.author,
    language: work.language,
    year: work.year,
    summary: work.summary,
    readable: true,
    featured: true,
  };
}

function pairToBrowse(pair: LibraryPair): BrowseItem {
  return {
    id: pair.id,
    title: pair.title,
    author: displayAuthor(pair.author),
    language: pair.language,
    year: pair.authorBirthYear ?? 0,
    summary:
      pair.subjects[0] ??
      `A ${pair.language} work with a public-domain English translation.`,
    readable: isReadable(pair.id),
    featured: false,
    confidence: pair.confidence,
    originalId: pair.originalId,
    englishId: pair.englishId,
  };
}

/** All browse cards: curated showcase first, then ingested pairs. */
export function getBrowseItems(): BrowseItem[] {
  const curatedIds = new Set(catalog.map((w) => w.id));
  const curated = catalog.map(curatedToBrowse);
  const pairs = libraryPairs
    .filter((p) => !curatedIds.has(p.id))
    .map(pairToBrowse);
  return [...curated, ...pairs];
}

/** Distinct languages across the whole library, sorted. */
export function getLibraryLanguages(): string[] {
  const langs = new Set<string>();
  catalog.forEach((w) => langs.add(w.language));
  libraryPairs.forEach((p) => langs.add(p.language));
  return Array.from(langs).sort();
}

export const libraryStats = {
  totalPairs: libraryPairs.length,
  readable: catalog.length + cachedTextIds.size,
  languages: getLibraryLanguages().length,
};
