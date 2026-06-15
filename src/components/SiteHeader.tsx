"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/catalog", label: "Library" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-md dark:border-night-line dark:bg-night/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent font-serif text-lg font-semibold text-paper shadow-sm ring-1 ring-black/5">
            L
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg font-semibold tracking-tight text-ink dark:text-night-ink">
              LiteraryThing
            </span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-ink-faint dark:text-night-soft">
              Facing-page classics
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent dark:bg-night-card dark:text-night-ink"
                    : "text-ink-soft hover:bg-paper-deep hover:text-ink dark:text-night-soft dark:hover:bg-night-card dark:hover:text-night-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
