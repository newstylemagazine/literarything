import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About — LiteraryThing",
  description:
    "What LiteraryThing is: a digital Loeb Classical Library of facing-page bilingual editions drawn from Project Gutenberg.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-prose flex-1 px-5 py-16 sm:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-accent">About</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink">
          A digital Loeb, for everyone.
        </h1>

        <div className="mt-8 space-y-6 font-serif text-lg leading-relaxed text-ink/90">
          <p>
            LiteraryThing presents public-domain classics the way the Loeb
            Classical Library does: the original language on one page, an English
            translation on the facing page. The aim is to make the great
            non-English works readable to anyone, with the original always a
            glance away.
          </p>
          <p>
            Every text — both the original and its translation — comes from{" "}
            <a
              href="https://www.gutenberg.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline decoration-line-strong underline-offset-4 hover:decoration-accent"
            >
              Project Gutenberg
            </a>
            , the open library of public-domain books. The reader is built to
            feel like an open book you can study from: adjust the type, switch
            themes, and export any opening to PDF.
          </p>
        </div>

        <div className="mt-12 rounded-xl border border-line bg-paper-card p-7">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Where this is headed
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
            <li>
              <span className="font-semibold text-ink">Live discovery.</span>{" "}
              Search and browse the whole of Project Gutenberg, filtered to works
              that have both an original and a public-domain English translation.
            </li>
            <li>
              <span className="font-semibold text-ink">An indexed pairing.</span>{" "}
              An ingest pipeline that automatically matches non-English originals
              with their English translations and grows the library over time.
            </li>
            <li>
              <span className="font-semibold text-ink">Reading depth.</span>{" "}
              Word-by-word glossing, morphology, and citation linking — the
              usefulness of a Perseus/Scaife viewer behind a simple interface.
            </li>
          </ul>
        </div>

        <div className="mt-10">
          <Link
            href="/catalog"
            className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover"
          >
            Browse the library
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
