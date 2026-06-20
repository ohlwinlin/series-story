import { Link } from "@tanstack/react-router";
import { posterUrl, type TmdbShowSummary } from "@/lib/tmdb";
import { Star } from "lucide-react";

export function PosterGrid({ shows }: { shows: TmdbShowSummary[] }) {
  if (!shows.length) {
    return <p className="text-muted-foreground">Nothing here yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {shows.map((s) => (
        <Link
          key={s.id}
          to="/show/$id"
          params={{ id: String(s.id) }}
          className="group"
        >
          <div className="relative overflow-hidden rounded-md bg-muted">
            <div className="aspect-[2/3]">
              {posterUrl(s.poster_path) ? (
                <img
                  src={posterUrl(s.poster_path)!}
                  alt={s.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                  {s.name}
                </div>
              )}
            </div>
            {s.vote_average > 0 && (
              <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-xs backdrop-blur">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {s.vote_average.toFixed(1)}
              </div>
            )}
          </div>
          <div className="mt-2 truncate text-sm font-medium">{s.name}</div>
          <div className="text-xs text-muted-foreground">
            {s.first_air_date?.slice(0, 4) ?? "—"}
          </div>
        </Link>
      ))}
    </div>
  );
}