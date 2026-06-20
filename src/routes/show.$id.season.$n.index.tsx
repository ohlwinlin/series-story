import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2 } from "lucide-react";
import { posterUrl, stillUrl, tmdb, type TmdbSeasonDetail, type TmdbShowDetail } from "@/lib/tmdb";
import { useAuth } from "@/lib/auth";
import {
  isEpisodeWatched,
  useEpisodeProgress,
  useLogEpisode,
  useLogSeason,
  useUnlogEpisode,
  useUnlogSeason,
} from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { ReviewSection } from "@/components/review-section";

export const Route = createFileRoute("/show/$id/season/$n/")({
  component: SeasonPage,
});

function SeasonPage() {
  const { id, n } = Route.useParams();
  const tmdbId = Number(id);
  const seasonNo = Number(n);
  const { user } = useAuth();

  const show = useQuery({
    queryKey: ["tmdb", "show", tmdbId],
    queryFn: () => tmdb<TmdbShowDetail>(`tv/${tmdbId}`),
  });
  const season = useQuery({
    queryKey: ["tmdb", "season", tmdbId, seasonNo],
    queryFn: () => tmdb<TmdbSeasonDetail>(`tv/${tmdbId}/season/${seasonNo}`),
  });

  const { data: progress } = useEpisodeProgress(user?.id, tmdbId);
  const logEpisode = useLogEpisode(user?.id, tmdbId);
  const unlogEpisode = useUnlogEpisode(user?.id, tmdbId);
  const logSeason = useLogSeason(user?.id, tmdbId);
  const unlogSeason = useUnlogSeason(user?.id, tmdbId);

  if (show.isLoading || season.isLoading)
    return <p className="text-muted-foreground">Loading…</p>;
  if (season.error || !season.data) return <p className="text-destructive">Season not found.</p>;

  const se = season.data;
  const watchedCount = se.episodes.filter((e) =>
    isEpisodeWatched(progress, seasonNo, e.episode_number),
  ).length;
  const allWatched = se.episodes.length > 0 && watchedCount === se.episodes.length;

  return (
    <article className="space-y-10">
      <header className="grid gap-6 md:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-lg bg-muted">
          {posterUrl(se.poster_path, "w342") ? (
            <img src={posterUrl(se.poster_path, "w342")!} alt={se.name} className="w-full" />
          ) : (
            <div className="aspect-[2/3]" />
          )}
        </div>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <Link to="/show/$id" params={{ id }} className="hover:underline">
              {show.data?.name ?? "Show"}
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{se.name}</h1>
          <div className="text-sm text-muted-foreground">
            {se.episodes.length} episode{se.episodes.length === 1 ? "" : "s"}
            {se.air_date && ` • aired ${se.air_date.slice(0, 4)}`}
            {user && ` • watched ${watchedCount}/${se.episodes.length}`}
          </div>
          {se.overview && <p className="leading-relaxed">{se.overview}</p>}
          {user && (
            <div className="flex flex-wrap gap-2 pt-2">
              {allWatched ? (
                <Button variant="outline" onClick={() => unlogSeason.mutate(seasonNo)}>
                  Unmark season
                </Button>
              ) : (
                <Button onClick={() => logSeason.mutate(seasonNo)}>
                  <Check className="mr-1 h-4 w-4" /> Mark season watched
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Episodes</h2>
        <ul className="space-y-3">
          {se.episodes.map((ep) => {
            const watched = isEpisodeWatched(progress, seasonNo, ep.episode_number);
            return (
              <li
                key={ep.id}
                className="flex gap-4 rounded-lg border border-border bg-card p-3"
              >
                <Link
                  to="/show/$id/season/$n/episode/$e"
                  params={{ id, n, e: String(ep.episode_number) }}
                  className="block w-32 shrink-0 overflow-hidden rounded-md bg-muted sm:w-44"
                >
                  <div className="aspect-video">
                    {stillUrl(ep.still_path, "w300") ? (
                      <img
                        src={stillUrl(ep.still_path, "w300")!}
                        alt={ep.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full" />
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to="/show/$id/season/$n/episode/$e"
                      params={{ id, n, e: String(ep.episode_number) }}
                      className="font-medium hover:underline"
                    >
                      {ep.episode_number}. {ep.name}
                    </Link>
                    {user && (
                      <Button
                        variant={watched ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          watched
                            ? unlogEpisode.mutate({ season: seasonNo, episode: ep.episode_number })
                            : logEpisode.mutate({ season: seasonNo, episode: ep.episode_number })
                        }
                      >
                        {watched ? (
                          <>
                            <CheckCircle2 className="mr-1 h-4 w-4" /> Watched
                          </>
                        ) : (
                          "Mark watched"
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {ep.air_date ?? "—"}
                  </div>
                  {ep.overview && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {ep.overview}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <ReviewSection
        target={{ type: "season", tmdbShowId: tmdbId, season: seasonNo }}
        title="Reviews on this season"
      />
    </article>
  );
}