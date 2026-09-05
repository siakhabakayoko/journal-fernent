import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { RubricTitle } from "@/components/RubricTitle";
import { getArticlesByRubric } from "@/lib/articles";
import { RUBRICS, type Rubric } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

const valid = new Set(RUBRICS.map((r) => r.slug));

export function generateStaticParams() {
  return RUBRICS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!valid.has(slug as Rubric)) return { title: "Rubrique" };
  const labels: Record<string, string> = {
    senegal: "Sénégal",
    afrique: "Afrique",
    international: "International",
    economie: "Économie",
    social: "Social",
    "notre-journal": "Notre Journal",
  };
  return {
    title: labels[slug],
    description: `Articles — rubrique ${labels[slug]} · Journal Ferñent`,
  };
}

export default async function RubricPage({ params }: Props) {
  const { slug } = await params;
  if (!valid.has(slug as Rubric)) notFound();
  const articles = await getArticlesByRubric(slug as Rubric);

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8">
      <RubricTitle slug={slug as Rubric} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
        {articles.length === 0 && (
          <p className="text-neutral-600 col-span-full">Aucun article dans cette rubrique.</p>
        )}
      </div>
    </div>
  );
}
