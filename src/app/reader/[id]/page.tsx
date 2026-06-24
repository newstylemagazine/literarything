import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { catalog, getWork } from "@/lib/catalog";

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return catalog.map((work) => ({ id: work.id }));
}

export async function generateMetadata({
  params,
}: ReaderPageProps): Promise<Metadata> {
  const { id } = await params;
  const work = getWork(id);
  if (!work) return { title: "Not found — LiteraryThing" };
  return {
    title: `${work.title} — LiteraryThing`,
    description: `${work.title} by ${work.author}, in a facing-page ${work.language}–English edition.`,
  };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { id } = await params;
  const work = getWork(id);
  if (!work) notFound();

  return <Reader work={work} />;
}
