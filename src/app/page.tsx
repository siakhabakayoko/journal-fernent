import { ArticleCard } from "@/components/ArticleCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ContactForm } from "@/components/ContactForm";
import { HomeCopy } from "@/components/HomeCopy";
import { BreakingNewsTicker } from "@/components/BreakingNewsTicker";
import { getFeaturedArticles, getRecentArticles } from "@/lib/articles";

export default async function HomePage() {
  const [featured, recent] = await Promise.all([
    getFeaturedArticles(),
    getRecentArticles(12),
  ]);
  const lead = featured[0];
  const secondary = featured.slice(1, 3);
  const recentFiltered = recent.filter(
    (a) => !featured.some((f) => f.id === a.id),
  );
  const tickerArticles = [...featured, ...recentFiltered].slice(0, 8);

  return (
    <div>
      <BreakingNewsTicker articles={tickerArticles} />

      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        {/* Hero lead */}
        {lead && (
          <section className="mb-8 sm:mb-10">
            <div className="flex items-end justify-between gap-4 mb-4">
              <HomeCopy
                section="aLaUne"
                as="h2"
                className="font-serif text-2xl sm:text-3xl font-bold tracking-tight"
              />
              <div className="hidden sm:block h-px flex-1 bg-rule mb-2.5 mx-4" />
              <span className="hidden sm:inline kicker text-muted !text-muted">
                Édition
              </span>
            </div>
            <ArticleCard article={lead} featured variant="hero" />
          </section>
        )}

        {/* Secondary featured + dense latest */}
        <section className="grid gap-8 lg:grid-cols-12 mb-10">
          <div className="lg:col-span-8 space-y-4">
            {secondary.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {secondary.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}

            <div className="pt-2">
              <div className="flex items-end gap-4 mb-4">
                <HomeCopy
                  section="recent"
                  as="h2"
                  className="font-serif text-2xl font-bold tracking-tight"
                />
                <div className="h-px flex-1 bg-rule mb-2" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {recentFiltered.slice(0, 6).map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="border border-rule bg-paper-elevated p-5 sm:p-6">
              <HomeCopy
                section="ourGoal"
                as="h2"
                className="font-serif text-xl font-bold text-fernent-red"
              />
              <div className="mt-2 h-px w-12 bg-fernent-red" aria-hidden />
              <HomeCopy
                section="ourGoalText"
                as="p"
                className="mt-3 text-sm text-muted leading-relaxed"
              />
            </div>

            <NewsletterForm />

            <ContactForm compact />

            <div className="border border-rule bg-paper-elevated p-5">
              <p className="kicker mb-1">Fil</p>
              <h2 className="font-serif text-lg font-bold mb-2">Dernières brèves</h2>
              <div>
                {recentFiltered.slice(0, 5).map((article) => (
                  <ArticleCard
                    key={`compact-${article.id}`}
                    article={article}
                    variant="compact"
                  />
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
