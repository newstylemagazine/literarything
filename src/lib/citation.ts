import type { CuratedWork } from "@/lib/catalog";

export type CitationStyle = "chicago" | "mla" | "apa";

const SITE_NAME = "LiteraryThing";

const PARTICLES = new Set([
  "von",
  "van",
  "de",
  "del",
  "della",
  "di",
  "da",
  "der",
  "den",
  "du",
  "la",
  "le",
  "el",
  "bin",
  "ibn",
]);

/** Abbreviate the given-name portion of an inverted name to initials (APA). */
function abbreviateGivenNames(authorSort: string): string {
  const commaIndex = authorSort.indexOf(",");
  if (commaIndex === -1) return authorSort; // mononym, e.g. "Voltaire"
  const surname = authorSort.slice(0, commaIndex).trim();
  const given = authorSort.slice(commaIndex + 1).trim();
  if (!given) return surname;
  const initials = given
    .split(/\s+/)
    .map((token) =>
      PARTICLES.has(token.toLowerCase()) ? token : `${token[0].toUpperCase()}.`,
    )
    .join(" ");
  return `${surname}, ${initials}`;
}

/** Convert "First Middle Last" into "F. M. Last" for APA translator credit. */
function translatorInitials(name: string): string {
  const tokens = name.trim().split(/\s+/);
  if (tokens.length === 1) return tokens[0];
  const last = tokens[tokens.length - 1];
  const initials = tokens
    .slice(0, -1)
    .map((token) =>
      PARTICLES.has(token.toLowerCase()) ? token : `${token[0].toUpperCase()}.`,
    )
    .join(" ");
  return `${initials} ${last}`;
}

function longDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function mlaDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export interface CitationInput {
  work: Pick<CuratedWork, "title" | "translator" | "authorSort">;
  url: string;
  accessed?: Date;
}

/** Build Chicago, MLA, and APA citations for a translated work on the site. */
export function buildCitations({
  work,
  url,
  accessed = new Date(),
}: CitationInput): Record<CitationStyle, string> {
  const { title, translator, authorSort } = work;

  const chicago = `${authorSort}. ${title}. Translated by ${translator}. ${SITE_NAME}. Accessed ${longDate(
    accessed,
  )}. ${url}.`;

  const mla = `${authorSort}. ${title}. Translated by ${translator}, ${SITE_NAME}, ${url}. Accessed ${mlaDate(
    accessed,
  )}.`;

  const apa = `${abbreviateGivenNames(authorSort)} (n.d.). ${title} (${translatorInitials(
    translator,
  )}, Trans.). ${SITE_NAME}. Retrieved ${longDate(accessed)}, from ${url}`;

  return { chicago, mla, apa };
}
