import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getSummaries } from "@/lib/catalog";
import { formatYear } from "@/lib/utils";

export default function HomePage() {
  const works = getSummaries();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="paper-grain absolute inset-0 -z-10" aria-hidden />
          <div className="mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-8 sm:pt-28">
            <div className="max-w-3xl animate-fade-in">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-paper-card px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                A digital Loeb Classical Library
              </p>
              <h1 className="font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
                The classics,
                <span className="block italic text-accent">
                  side by side.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                Read public-domain masterworks in facing-page editions — the
                original language on the left, a public-domain English
                translation on the right — drawn from Project Gutenberg.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/catalog"
                  className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-paper shadow-sm transition-colors hover:bg-accent-hover"
                >
                  Browse the library
                </Link>
                <Link
                  href={`/reader/${works[0]?.id ?? "candide"}`}
                  className="rounded-full border border-line-strong bg-paper-card px-7 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink-faint"
                >
                  Open the reader
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured editions */}
        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <div className="mb-7 flex items-end justify-between border-b border-line pb-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-ink">
                Featured editions
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Hand-curated bilingual texts to start with.
              </p>
            </div>
            <Link
              href="/catalog"
              className="hidden text-sm font-medium text-accent hover:underline sm:block"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
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
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Read edition
                  <span className="transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="grid gap-8 rounded-xl border border-line bg-paper-card p-8 sm:grid-cols-3 sm:p-10">
            {[
              {
                title: "Facing-page reading",
                body: "Original and translation laid out as an open book, paged like a physical edition.",
              },
              {
                title: "Public-domain texts",
                body: "Every original and translation is drawn from Project Gutenberg's open library.",
              },
              {
                title: "Made for study",
                body: "Adjust type, theme, and size; export to PDF; deep-link any opening to share.",
              },
            ].map((feature) => (
              <div key={feature.title}>
                <h3 className="font-serif text-lg font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
