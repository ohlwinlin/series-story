import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search, LogOut, User as UserIcon, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tmdb, posterUrl, type TmdbShowSummary } from "@/lib/tmdb";

export function SiteHeader() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TmdbShowSummary[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setUsername(null);
      return;
    }
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? null));
  }, [user]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await tmdb<{ results: TmdbShowSummary[] }>("search/tv", { query, include_adult: false });
        setResults((data.results ?? []).slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Tv className="h-5 w-5 text-primary" />
          <span>Serialog</span>
        </Link>

        <div ref={wrapRef} className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            className="pl-9"
          />
          {open && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-96 overflow-auto rounded-md border border-border bg-popover shadow-lg">
              {results.map((r) => (
                <Link
                  key={r.id}
                  to="/show/$id"
                  params={{ id: String(r.id) }}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10"
                >
                  {posterUrl(r.poster_path, "w185") ? (
                    <img
                      src={posterUrl(r.poster_path, "w185")!}
                      alt=""
                      className="h-14 w-10 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-14 w-10 rounded bg-muted" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.first_air_date?.slice(0, 4) ?? "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {username && (
                <Link
                  to="/profile/$username"
                  params={{ username }}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent/10"
                >
                  <UserIcon className="h-4 w-4" />
                  {username}
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}