import { BreakingNewsTicker } from "@/components/BreakingNewsTicker";
import { HomeSections } from "@/components/HomeSections";
import { getRecentArticles } from "@/lib/articles";
import { getIssues } from "@/lib/issues";
import { getVideos } from "@/lib/videos";

export default async function HomePage() {
  const [recent, videos, issues] = await Promise.all([
    getRecentArticles(12),
    getVideos(),
    getIssues(),
  ]);

  const breves = recent
    .filter((a) => a.rubric !== "notre-journal")
    .slice(0, 3);

  const latestVideos = [...videos]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const latestIssues = [...issues]
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .slice(0, 3);

  const tickerArticles = recent
    .filter((a) => a.rubric !== "notre-journal")
    .slice(0, 8);

  return (
    <div>
      <BreakingNewsTicker articles={tickerArticles} />
      <HomeSections
        articles={breves}
        videos={latestVideos}
        issues={latestIssues}
      />
    </div>
  );
}
