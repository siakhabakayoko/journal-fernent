import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug, getArticles } from "@/lib/articles";
import { Comments } from "@/components/Comments";
import { ArticleChrome } from "@/components/ArticleChrome";

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
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.body.split(/\n\n+/).filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-3 sm:px-4 py-8">
      <ArticleChrome article={article} />
      <div className="prose-fernent mt-8 text-base sm:text-[1.05rem] text-neutral-900">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <Comments articleId={article.id} enabled={article.commentsEnabled} />
      <p className="mt-10">
        <Link href="/" className="text-sm font-semibold text-fernent-red hover:underline">
          ← Ferñent
        </Link>
      </p>
    </article>
  );
}
