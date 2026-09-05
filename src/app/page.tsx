import { Logo } from "@/components/Logo";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { HomeCopy } from "@/components/HomeCopy";
import { getFeaturedArticles, getRecentArticles } from "@/lib/articles";
import { MOTTO } from "@/lib/types";

export default async function HomePage() {
  const [featured, recent] = await Promise.all([
    getFeaturedArticles(),
    getRecentArticles(9),
  ]);
  const recentFiltered = recent.filter(
    (a) => !featured.some((f) => f.id === a.id),
  );

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
      <section className="border-b-2 border-fernent-red pb-6 mb-8 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex items-start gap-4 flex-1">
          <Logo className="h-16 w-16 sm:h-20 sm:w-20 shrink-0" />
          <div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-black">
              Ferñent
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-neutral-700 leading-relaxed italic border-l-4 border-fernent-red pl-3">
              « {MOTTO} »
            </p>
          </div>
        </div>
      </section>

      <HomeCopy section="aLaUne" as="h2" className="font-serif text-2xl font-bold mb-4" />
      <div className="grid gap-4 lg:grid-cols-2 mb-10">
        {featured.map((article, i) => (
          <div key={article.id} className={i === 0 ? "lg:col-span-2" : ""}>
            <ArticleCard article={article} featured={i === 0} />
          </div>
        ))}
      </div>

      <section className="grid gap-8 lg:grid-cols-3 mb-10">
        <div className="lg:col-span-2">
          <HomeCopy section="recent" as="h2" className="font-serif text-2xl font-bold mb-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            {recentFiltered.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
        <aside className="space-y-6">
          <div className="border border-neutral-200 bg-neutral-50 p-5">
            <HomeCopy section="ourGoal" as="h2" className="font-serif text-xl font-bold text-fernent-red" />
            <HomeCopy section="ourGoalText" as="p" className="mt-2 text-sm text-neutral-700 leading-relaxed" />
          </div>
          <NewsletterForm />
        </aside>
      </section>
    </div>
  );
}
