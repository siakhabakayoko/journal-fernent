import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug, getArticles, getArticlesByRubric } from "@/lib/articles";
import { Comments } from "@/components/Comments";
import { ArticleChrome } from "@/components/ArticleChrome";
import { ArticleCard } from "@/components/ArticleCard";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      authors: [article.author],
      ...(article.coverImage
        ? { images: [{ url: article.coverImage }] }
        : {}),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.body.split(/\n\n+/).filter(Boolean);
  const related = (await getArticlesByRubric(article.rubric))
    .filter((a) => a.id !== article.id)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-10">
      <article className="mx-auto max-w-3xl">
        <ArticleChrome article={article} />
        <div className="prose-fernent mt-8 text-ink mx-auto">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <Comments articleId={article.id} enabled={article.commentsEnabled} />
        <p className="mt-10">
          <Link
            href="/"
            className="text-sm font-bold uppercase tracking-wider text-fernent-red hover:underline underline-offset-4"
          >
            ← Ferñent
          </Link>
        </p>
      </article>

      {related.length > 0 && (
        <section className="mt-14 pt-8 border-t border-rule">
          <div className="flex items-end gap-4 mb-5">
            <h2 className="font-serif text-2xl font-bold tracking-tight">
              Dans la même rubrique
            </h2>
            <div className="h-px flex-1 bg-rule mb-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
