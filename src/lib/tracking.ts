import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tmdb, type TmdbSeasonDetail } from "@/lib/tmdb";
import { toast } from "sonner";

export type WatchStatus = "watchlist" | "watching" | "paused" | "dropped" | "completed";
export const WATCH_STATUSES: WatchStatus[] = ["watchlist", "watching", "paused", "dropped", "completed"];

export const WATCH_STATUS_LABEL: Record<WatchStatus, string> = {
  watchlist: "Watchlist",
  watching: "Watching",
  paused: "Paused",
  dropped: "Dropped",
  completed: "Completed",
};

// ---------- watch_status ----------

export function useWatchStatus(userId: string | undefined, tmdbShowId: number) {
  return useQuery({
    queryKey: ["watch_status", userId, tmdbShowId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_status")
        .select("status")
        .eq("user_id", userId!)
        .eq("tmdb_show_id", tmdbShowId)
        .maybeSingle();
      if (error) throw error;
      return (data?.status as WatchStatus | undefined) ?? null;
    },
  });
}

export function useSetWatchStatus(userId: string | undefined, tmdbShowId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: WatchStatus | null) => {
      if (!userId) throw new Error("Not signed in");
      if (status === null) {
        const { error } = await supabase
          .from("watch_status")
          .delete()
          .eq("user_id", userId)
          .eq("tmdb_show_id", tmdbShowId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("watch_status")
          .upsert(
            { user_id: userId, tmdb_show_id: tmdbShowId, status },
            { onConflict: "user_id,tmdb_show_id" },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watch_status", userId, tmdbShowId] });
      qc.invalidateQueries({ queryKey: ["profile_watch_lists", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- episode_progress ----------

export function useEpisodeProgress(userId: string | undefined, tmdbShowId: number) {
  return useQuery({
    queryKey: ["episode_progress", userId, tmdbShowId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episode_progress")
        .select("season_number, episode_number")
        .eq("user_id", userId!)
        .eq("tmdb_show_id", tmdbShowId);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) set.add(`${r.season_number}:${r.episode_number}`);
      return set;
    },
  });
}

export function isEpisodeWatched(progress: Set<string> | undefined, s: number, e: number) {
  return !!progress?.has(`${s}:${e}`);
}

async function invalidateEpisode(qc: ReturnType<typeof useQueryClient>, userId: string, tmdbShowId: number) {
  await qc.invalidateQueries({ queryKey: ["episode_progress", userId, tmdbShowId] });
  await qc.invalidateQueries({ queryKey: ["user_stats", userId] });
}

export function useLogEpisode(userId: string | undefined, tmdbShowId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { season: number; episode: number }) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("episode_progress")
        .upsert(
          {
            user_id: userId,
            tmdb_show_id: tmdbShowId,
            season_number: vars.season,
            episode_number: vars.episode,
          },
          { onConflict: "user_id,tmdb_show_id,season_number,episode_number" },
        );
      if (error) throw error;
    },
    onSuccess: () => userId && invalidateEpisode(qc, userId, tmdbShowId),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnlogEpisode(userId: string | undefined, tmdbShowId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { season: number; episode: number }) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("episode_progress")
        .delete()
        .eq("user_id", userId)
        .eq("tmdb_show_id", tmdbShowId)
        .eq("season_number", vars.season)
        .eq("episode_number", vars.episode);
      if (error) throw error;
    },
    onSuccess: () => userId && invalidateEpisode(qc, userId, tmdbShowId),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLogSeason(userId: string | undefined, tmdbShowId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (season: number) => {
      if (!userId) throw new Error("Not signed in");
      // Fetch episodes from TMDB to know which to insert
      const detail = await tmdb<TmdbSeasonDetail>(`tv/${tmdbShowId}/season/${season}`);
      const rows = (detail.episodes ?? []).map((ep) => ({
        user_id: userId,
        tmdb_show_id: tmdbShowId,
        season_number: season,
        episode_number: ep.episode_number,
      }));
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("episode_progress")
        .upsert(rows, { onConflict: "user_id,tmdb_show_id,season_number,episode_number" });
      if (error) throw error;
    },
    onSuccess: () => userId && invalidateEpisode(qc, userId, tmdbShowId),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnlogSeason(userId: string | undefined, tmdbShowId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (season: number) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("episode_progress")
        .delete()
        .eq("user_id", userId)
        .eq("tmdb_show_id", tmdbShowId)
        .eq("season_number", season);
      if (error) throw error;
    },
    onSuccess: () => userId && invalidateEpisode(qc, userId, tmdbShowId),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- reviews ----------

export type ReviewTarget =
  | { type: "show"; tmdbShowId: number }
  | { type: "season"; tmdbShowId: number; season: number }
  | { type: "episode"; tmdbShowId: number; season: number; episode: number };

export function reviewQueryKey(t: ReviewTarget) {
  if (t.type === "show") return ["reviews", "show", t.tmdbShowId] as const;
  if (t.type === "season") return ["reviews", "season", t.tmdbShowId, t.season] as const;
  return ["reviews", "episode", t.tmdbShowId, t.season, t.episode] as const;
}

export function useReviews(target: ReviewTarget) {
  return useQuery({
    queryKey: reviewQueryKey(target),
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("*, profiles!reviews_user_id_fkey(username, avatar_url)")
        .eq("target_type", target.type)
        .eq("tmdb_show_id", target.tmdbShowId)
        .order("created_at", { ascending: false });
      if (target.type === "season" || target.type === "episode") {
        q = q.eq("season_number", target.season);
      }
      if (target.type === "episode") {
        q = q.eq("episode_number", target.episode);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyReview(userId: string | undefined, target: ReviewTarget) {
  return useQuery({
    queryKey: ["my_review", userId, ...reviewQueryKey(target)],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId!)
        .eq("target_type", target.type)
        .eq("tmdb_show_id", target.tmdbShowId);
      if (target.type === "season" || target.type === "episode") {
        q = q.eq("season_number", target.season);
      }
      if (target.type === "episode") {
        q = q.eq("episode_number", target.episode);
      }
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useUpsertReview(userId: string | undefined, target: ReviewTarget) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rating: number; text: string; contains_spoilers: boolean }) => {
      if (!userId) throw new Error("Not signed in");
      const base: any = {
        user_id: userId,
        target_type: target.type,
        tmdb_show_id: target.tmdbShowId,
        season_number: target.type === "show" ? null : target.season,
        episode_number: target.type === "episode" ? target.episode : null,
        rating: vars.rating,
        text: vars.text,
        contains_spoilers: vars.contains_spoilers,
      };
      // emulate upsert via select+update/insert because we use partial unique indexes
      let q = supabase
        .from("reviews")
        .select("id")
        .eq("user_id", userId)
        .eq("target_type", target.type)
        .eq("tmdb_show_id", target.tmdbShowId);
      if (target.type !== "show") q = q.eq("season_number", (target as any).season);
      if (target.type === "episode") q = q.eq("episode_number", target.episode);
      const { data: existing, error: selErr } = await q.maybeSingle();
      if (selErr) throw selErr;
      if (existing) {
        const { error } = await supabase.from("reviews").update(base).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert(base);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewQueryKey(target) });
      qc.invalidateQueries({ queryKey: ["my_review", userId] });
      qc.invalidateQueries({ queryKey: ["avg_rating", target.tmdbShowId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteReview(userId: string | undefined, target: ReviewTarget) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewQueryKey(target) });
      qc.invalidateQueries({ queryKey: ["my_review", userId] });
      qc.invalidateQueries({ queryKey: ["avg_rating", target.tmdbShowId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useShowAvgRating(tmdbShowId: number) {
  return useQuery({
    queryKey: ["avg_rating", tmdbShowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("tmdb_show_id", tmdbShowId)
        .eq("target_type", "show");
      if (error) throw error;
      if (!data || data.length === 0) return { avg: null as number | null, count: 0 };
      const sum = data.reduce((a, r) => a + (r.rating ?? 0), 0);
      return { avg: sum / data.length, count: data.length };
    },
  });
}