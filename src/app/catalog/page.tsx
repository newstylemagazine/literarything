import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import {
  getBrowseItems,
  getLibraryLanguages,
  libraryStats,
} from "@/lib/library";

export const metadata: Metadata = {
  title: "Library — LiteraryThing",
  description:
    "Browse facing-page bilingual editions of public-domain classics.",
};

export default function CatalogPage() {
  const works = getBrowseItems();
  const languages = getLibraryLanguages();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8">
        <header className="max-w-2xl">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
            The Library
          </h1>
          <p className="mt-3 text-ink-soft">
            {libraryStats.totalPairs.toLocaleString()} bilingual pairs keyed from
            Project Gutenberg across {libraryStats.languages} languages —
            original beside English. {libraryStats.readable} are readable on-site
            today; the rest link to Gutenberg as full text is indexed.
          </p>
        </header>
        <CatalogBrowser works={works} languages={languages} />
      </main>
      <SiteFooter />
    </div>
  );
}
