"use client";

import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { AboutNotreJournal } from "@/components/AboutNotreJournal";
import { NotreHistoire } from "@/components/NotreHistoire";
import { IssueCards } from "@/components/IssueCards";
import { VideoCard } from "@/components/CapsulesClient";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ContactForm } from "@/components/ContactForm";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Article, MonthlyIssue, Video } from "@/lib/types";

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-end gap-4 mb-5 min-w-0">
      <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight shrink-0">
        {title}
      </h2>
      <div className="hidden sm:block h-px flex-1 bg-rule mb-2.5" />
    </div>
  );
}

function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-5 flex justify-end">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-fernent-red hover:underline underline-offset-4"
      >
        {label} →
      </Link>
    </div>
  );
}

export function HomeSections({
  articles,
  videos,
  issues,
}: {
  articles: Article[];
  videos: Video[];
  issues: MonthlyIssue[];
}) {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10 space-y-12 sm:space-y-16">
      {/* 1. Brèves */}
      <section aria-labelledby="home-breves">
        <SectionHeading title={t.home.breves} />
        <div id="home-breves" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
        <SeeAllLink href="/breves" label={t.home.seeAllArticles} />
      </section>

      {/* 2. Capsules */}
      <section aria-labelledby="home-capsules">
        <SectionHeading title={t.home.capsules} />
        <ul
          id="home-capsules"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {videos.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </ul>
        <SeeAllLink href="/capsules" label={t.home.seeAllCapsules} />
      </section>

      {/* 3. Mensuel */}
      <section aria-labelledby="home-mensuel">
        <SectionHeading title={t.home.mensuel} />
        <div id="home-mensuel">
          <IssueCards issues={issues} />
        </div>
        <SeeAllLink href="/mensuel" label={t.home.seeAllIssues} />
      </section>

      {/* 4. Qui sommes-nous */}
      <section
        id="qui-sommes-nous"
        aria-labelledby="home-about"
        className="scroll-mt-28 border border-rule bg-paper-elevated p-5 sm:p-8"
      >
        <div className="flex items-end gap-4 mb-6">
          <h2
            id="home-about"
            className="font-serif text-2xl sm:text-3xl font-bold tracking-tight"
          >
            {t.home.about}
          </h2>
          <div className="h-px flex-1 bg-rule mb-2.5" />
        </div>

        <div className="space-y-10">
          <div>
            <p className="kicker text-fernent-red mb-3">{t.home.notreJournal}</p>
            <AboutNotreJournal title={t.home.notreJournalTitle} />
          </div>

          <div className="border-t border-rule pt-8">
            <NotreHistoire />
          </div>
        </div>
      </section>

      {/* Newsletter + contact */}
      <section className="grid gap-6 sm:grid-cols-2">
        <NewsletterForm />
        <ContactForm compact />
      </section>
    </div>
  );
}
