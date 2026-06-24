import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { catalog, getWork, type CuratedWork } from "@/lib/catalog";
import cachedIds from "@/data/cached-texts.json";

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

const cachedTextIds = cachedIds as string[];

/** Resolve a work: curated (bundled) or an ingested pair cached on disk. */
async function resolveWork(id: string): Promise<CuratedWork | undefined> {
  const curated = getWork(id);
  if (curated) return curated;
  if (!cachedTextIds.includes(id)) return undefined;
  const file = path.join(process.cwd(), "src", "data", "texts", `${id}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as CuratedWork;
  } catch {
    return undefined;
  }
}

export function generateStaticParams() {
  const ids = [...catalog.map((w) => w.id), ...cachedTextIds];
  return Array.from(new Set(ids)).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: ReaderPageProps): Promise<Metadata> {
  const { id } = await params;
  const work = await resolveWork(id);
  if (!work) return { title: "Not found — LiteraryThing" };
  return {
    title: `${work.title} — LiteraryThing`,
    description: `${work.title} by ${work.author}, in a facing-page ${work.language}–English edition.`,
  };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { id } = await params;
  const work = await resolveWork(id);
  if (!work) notFound();

  return <Reader work={work} />;
}
