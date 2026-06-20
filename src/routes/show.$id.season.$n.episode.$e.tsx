import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Calendar, Star } from "lucide-react";
import { stillUrl, tmdb, type TmdbEpisode } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  isEpisodeWatched,
  useEpisodeProgress,
  useLogEpisode,
  useUnlogEpisode,
} from "@/lib/tracking";
import { ReviewSection } from "@/components/review-section";

export const Route = createFileRoute("/show/$id/season/$n/episode/$e")({
  component: EpisodePage,
});

function EpisodePage() {
  const { id, n, e } = Route.useParams();
  const tmdbId = Number(id);
  const seasonNo = Number(n);
  const epNo = Number(e);
  const { user } = useAuth();

  const ep = useQuery({
    queryKey: ["tmdb", "episode", tmdbId, seasonNo, epNo],
    queryFn: () => tmdb<TmdbEpisode>(`tv/${tmdbId}/season/${seasonNo}/episode/${epNo}`),
  });
  const { data: progress } = useEpisodeProgress(user?.id, tmdbId);
  const log = useLogEpisode(user?.id, tmdbId);
  const unlog = useUnlogEpisode(user?.id, tmdbId);

  if (ep.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (ep.error || !ep.data) return <p className="text-destructive">Episode not found.</p>;

  const d = ep.data;
  const watched = isEpisodeWatched(progress, seasonNo, epNo);

  return (
    <article className="space-y-10">
      <div className="text-sm text-muted-foreground">
        <Link to="/show/$id" params={{ id }} className="hover:underline">
          Show
        </Link>{" "}
        /{" "}
        <Link to="/show/$id/season/$n" params={{ id, n }} className="hover:underline">
          Season {seasonNo}
        </Link>
      </div>

      <header className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-lg bg-muted">
          {stillUrl(d.still_path, "w780") ? (
            <img src={stillUrl(d.still_path, "w780")!} alt={d.name} className="w-full" />
          ) : (
            <div className="aspect-video" />
          )}
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {d.episode_number}. {d.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {d.air_date ?? "—"}
            </span>
            {d.runtime && (
              <>
                <span>•</span>
                <span>{d.runtime} min</span>
              </>
            )}
            {d.vote_average > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  {d.vote_average.toFixed(1)}
                </span>
              </>
            )}
          </div>
          {d.overview && <p className="leading-relaxed">{d.overview}</p>}
          {user && (
            <Button
              variant={watched ? "default" : "outline"}
              onClick={() =>
                watched
                  ? unlog.mutate({ season: seasonNo, episode: epNo })
                  : log.mutate({ season: seasonNo, episode: epNo })
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
      </header>

      <ReviewSection
        target={{ type: "episode", tmdbShowId: tmdbId, season: seasonNo, episode: epNo }}
        title="Reviews on this episode"
      />
    </article>
  );
}