import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { tmdb, type TmdbShowSummary } from "@/lib/tmdb";
import { PosterGrid } from "@/components/poster-grid";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Serialog — Track and review TV series" },
      {
        name: "description",
        content: "Discover, track and review TV series. Mark episodes watched and share what you think.",
      },
      { property: "og:title", content: "Serialog" },
      { property: "og:description", content: "Track what you watch, rate every episode." },
    ],
  }),
  component: Index,
});

function Index() {
  const trending = useQuery({
    queryKey: ["tmdb", "trending"],
    queryFn: () => tmdb<{ results: TmdbShowSummary[] }>("trending/tv/week"),
  });
  const popular = useQuery({
    queryKey: ["tmdb", "popular"],
    queryFn: () => tmdb<{ results: TmdbShowSummary[] }>("tv/popular"),
  });

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border bg-card px-6 py-10 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Track every episode. Share every reaction.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Find a series, mark what you've watched, and write reviews on the show, a season,
          or a single episode. Powered by TMDB.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Trending this week</h2>
        {trending.isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : trending.error ? (
          <p className="text-destructive">Could not load trending shows.</p>
        ) : (
          <PosterGrid shows={trending.data?.results.slice(0, 12) ?? []} />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Popular</h2>
        {popular.isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : popular.error ? (
          <p className="text-destructive">Could not load popular shows.</p>
        ) : (
          <PosterGrid shows={popular.data?.results.slice(0, 12) ?? []} />
        )}
      </section>
    </div>
  );
}
