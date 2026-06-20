import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  WATCH_STATUSES,
  WATCH_STATUS_LABEL,
  useSetWatchStatus,
  useWatchStatus,
  type WatchStatus,
} from "@/lib/tracking";

export function WatchStatusSelector({ tmdbShowId }: { tmdbShowId: number }) {
  const { user } = useAuth();
  const { data: current } = useWatchStatus(user?.id, tmdbShowId);
  const mut = useSetWatchStatus(user?.id, tmdbShowId);

  if (!user) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent/10"
      >
        Sign in to track
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={current ? "default" : "outline"}
          className={current ? "" : "border-border"}
        >
          {current ? WATCH_STATUS_LABEL[current as WatchStatus] : "Add to list"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {WATCH_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => mut.mutate(s)}
            className="flex items-center justify-between gap-3"
          >
            <span>{WATCH_STATUS_LABEL[s]}</span>
            {current === s && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        {current && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => mut.mutate(null)}
              className="text-destructive"
            >
              Remove from list
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}