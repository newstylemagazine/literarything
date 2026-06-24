import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/70 bg-paper-card/60 dark:border-night-line dark:bg-night-card/40">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-sm">
            <p className="font-serif text-base font-semibold text-ink dark:text-night-ink">
              LiteraryThing
            </p>
            <p className="mt-1 text-sm text-ink-soft dark:text-night-soft">
              Facing-page bilingual editions of public-domain classics, in the
              spirit of the Loeb Classical Library.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Link
              href="/catalog"
              className="text-ink-soft transition-colors hover:text-accent dark:text-night-soft"
            >
              Library
            </Link>
            <Link
              href="/about"
              className="text-ink-soft transition-colors hover:text-accent dark:text-night-soft"
            >
              About
            </Link>
            <a
              href="https://www.gutenberg.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-soft transition-colors hover:text-accent dark:text-night-soft"
            >
              Project Gutenberg
            </a>
          </div>
        </div>
        <p className="mt-8 text-xs text-ink-faint dark:text-night-soft">
          Texts are in the public domain, sourced from Project Gutenberg.
        </p>
      </div>
    </footer>
  );
}
