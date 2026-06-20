import { supabase } from "@/integrations/supabase/client";

export const TMDB_IMG = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" | "original" = "w342") {
  if (!path) return null;
  return `${TMDB_IMG}/${size}${path}`;
}

export function stillUrl(path: string | null | undefined, size: "w300" | "w780" | "original" = "w780") {
  if (!path) return null;
  return `${TMDB_IMG}/${size}${path}`;
}

export async function tmdb<T = any>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("tmdb", {
    body: { path, params },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  return data as T;
}

export interface TmdbShowSummary {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
}

export interface TmdbSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number;
}

export interface TmdbShowDetail extends TmdbShowSummary {
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  tagline: string;
  status: string;
  seasons: TmdbSeasonSummary[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface TmdbSeasonDetail {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episodes: TmdbEpisode[];
}