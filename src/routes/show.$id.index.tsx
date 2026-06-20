import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, Calendar } from "lucide-react";
import { posterUrl, tmdb, type TmdbShowDetail } from "@/lib/tmdb";
import { WatchStatusSelector } from "@/components/watch-status-selector";
import { ReviewSection } from "@/components/review-section";
import { useShowAvgRating } from "@/lib/tracking";

export const Route = createFileRoute("/show/$id")({
  component: ShowPage,
});

function ShowPage() {
  const { id } = Route.useParams();
  const tmdbId = Number(id);

  const show = useQuery({
    queryKey: ["tmdb", "show", tmdbId],
    queryFn: () => tmdb<TmdbShowDetail>(`tv/${tmdbId}`),
  });
  const { data: avg } = useShowAvgRating(tmdbId);

  if (show.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (show.error || !show.data) return <p className="text-destructive">Show not found.</p>;

  const s = show.data;

  return (
    <article className="space-y-10">
      <header className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-lg bg-muted">
          {posterUrl(s.poster_path, "w500") ? (
            <img
              src={posterUrl(s.poster_path, "w500")!}
              alt={s.name}
              className="w-full"
            />
          ) : (
            <div className="aspect-[2/3]" />
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{s.name}</h1>
            {s.tagline && <p className="mt-1 italic text-muted-foreground">{s.tagline}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {s.first_air_date?.slice(0, 4) ?? "—"}
            </span>
            <span>•</span>
            <span>
              {s.number_of_seasons} season{s.number_of_seasons === 1 ? "" : "s"}
            </span>
            <span>•</span>
            <span>{s.number_of_episodes} episodes</span>
            {s.vote_average > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" /> TMDB {s.vote_average.toFixed(1)}
                </span>
              </>
            )}
            {avg && avg.count > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" /> Serialog{" "}
                  {avg.avg!.toFixed(1)} ({avg.count})
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {s.genres?.map((g) => (
              <span
                key={g.id}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {g.name}
              </span>
            ))}
          </div>
          {s.overview && <p className="leading-relaxed">{s.overview}</p>}
          <div className="pt-2">
            <WatchStatusSelector tmdbShowId={tmdbId} />
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Seasons</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {s.seasons
            .filter((se) => se.season_number > 0)
            .map((se) => (
              <Link
                key={se.id}
                to="/show/$id/season/$n"
                params={{ id: String(tmdbId), n: String(se.season_number) }}
                className="group"
              >
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-muted">
                  {posterUrl(se.poster_path) ? (
                    <img
                      src={posterUrl(se.poster_path)!}
                      alt={se.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      {se.name}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium">{se.name}</div>
                <div className="text-xs text-muted-foreground">
                  {se.episode_count} episodes
                </div>
              </Link>
            ))}
        </div>
      </section>

      <ReviewSection target={{ type: "show", tmdbShowId: tmdbId }} title="Reviews on this show" />
    </article>
  );
}