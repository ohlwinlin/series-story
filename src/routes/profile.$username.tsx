import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tmdb, posterUrl, type TmdbShowSummary } from "@/lib/tmdb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WATCH_STATUSES, WATCH_STATUS_LABEL, type WatchStatus } from "@/lib/tracking";

export const Route = createFileRoute("/profile/$username")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();

  const profile = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, created_at")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const userId = profile.data?.id;

  const watchLists = useQuery({
    queryKey: ["profile_watch_lists", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_status")
        .select("tmdb_show_id, status, updated_at")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useQuery({
    queryKey: ["user_stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [eps, completed, ratings] = await Promise.all([
        supabase
          .from("episode_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId!),
        supabase
          .from("watch_status")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId!)
          .eq("status", "completed"),
        supabase.from("reviews").select("rating").eq("user_id", userId!),
      ]);
      const ratingValues = (ratings.data ?? []).map((r) => r.rating);
      const avg =
        ratingValues.length > 0
          ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
          : null;
      return {
        totalEpisodes: eps.count ?? 0,
        completedShows: completed.count ?? 0,
        avgRating: avg,
        reviewCount: ratingValues.length,
      };
    },
  });

  const myReviews = useQuery({
    queryKey: ["profile_reviews", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (profile.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!profile.data) return <p className="text-destructive">Profile not found.</p>;

  return (
    <article className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">@{profile.data.username}</h1>
          {profile.data.bio && (
            <p className="mt-1 max-w-xl text-muted-foreground">{profile.data.bio}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <Stat label="Completed shows" value={stats.data?.completedShows ?? 0} />
          <Stat label="Episodes watched" value={stats.data?.totalEpisodes ?? 0} />
          <Stat label="Reviews" value={stats.data?.reviewCount ?? 0} />
          <Stat
            label="Avg rating"
            value={stats.data?.avgRating ? stats.data.avgRating.toFixed(1) : "—"}
          />
        </div>
      </header>

      <Tabs defaultValue="watching">
        <TabsList>
          {WATCH_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {WATCH_STATUS_LABEL[s]}
            </TabsTrigger>
          ))}
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {WATCH_STATUSES.map((s) => (
          <TabsContent key={s} value={s} className="mt-6">
            <StatusList status={s} items={(watchLists.data ?? []).filter((w) => w.status === s)} />
          </TabsContent>
        ))}

        <TabsContent value="reviews" className="mt-6 space-y-3">
          {(myReviews.data ?? []).length === 0 ? (
            <p className="text-muted-foreground">No reviews yet.</p>
          ) : (
            (myReviews.data ?? []).map((r: any) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/show/$id"
                    params={{ id: String(r.tmdb_show_id) }}
                    className="text-sm font-medium hover:underline"
                  >
                    {r.target_type === "show"
                      ? "Show review"
                      : r.target_type === "season"
                        ? `Season ${r.season_number}`
                        : `S${r.season_number}E${r.episode_number}`}
                  </Link>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    {r.rating}/10
                  </span>
                </div>
                {r.text && (
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {r.text}
                  </p>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusList({
  status,
  items,
}: {
  status: WatchStatus;
  items: { tmdb_show_id: number }[];
}) {
  const showQueries = useQueries({
    queries: items.map((it) => ({
      queryKey: ["tmdb", "show", it.tmdb_show_id],
      queryFn: () => tmdb<TmdbShowSummary>(`tv/${it.tmdb_show_id}`),
    })),
  });

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground">Nothing in {WATCH_STATUS_LABEL[status]} yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {showQueries.map((q, i) => {
        const s = q.data;
        const id = items[i].tmdb_show_id;
        return (
          <Link
            key={id}
            to="/show/$id"
            params={{ id: String(id) }}
            className="group"
          >
            <div className="aspect-[2/3] overflow-hidden rounded-md bg-muted">
              {s && posterUrl(s.poster_path) ? (
                <img
                  src={posterUrl(s.poster_path)!}
                  alt={s.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="mt-2 truncate text-sm font-medium">{s?.name ?? "…"}</div>
          </Link>
        );
      })}
    </div>
  );
}