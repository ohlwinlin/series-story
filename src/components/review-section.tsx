import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import {
  useDeleteReview,
  useMyReview,
  useReviews,
  useUpsertReview,
  type ReviewTarget,
} from "@/lib/tracking";
import { toast } from "sonner";

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="rounded p-0.5 hover:bg-accent/10"
          aria-label={`Rate ${n}`}
        >
          <Star
            className={`h-5 w-5 ${n <= value ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{value}/10</span>
    </div>
  );
}

export function ReviewSection({ target, title = "Reviews" }: { target: ReviewTarget; title?: string }) {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useReviews(target);
  const { data: mine } = useMyReview(user?.id, target);
  const upsert = useUpsertReview(user?.id, target);
  const del = useDeleteReview(user?.id, target);

  const [rating, setRating] = useState(8);
  const [text, setText] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (mine) {
      setRating(mine.rating);
      setText(mine.text ?? "");
      setSpoilers(mine.contains_spoilers);
    }
  }, [mine]);

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">{title}</h2>

      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upsert.mutate(
              { rating, text, contains_spoilers: spoilers },
              {
                onSuccess: () => toast.success(mine ? "Review updated" : "Review posted"),
              },
            );
          }}
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">{mine ? "Your review" : "Write a review"}</span>
            <RatingPicker value={rating} onChange={setRating} />
          </div>
          <Textarea
            placeholder="Share your thoughts (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-between gap-3">
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={spoilers}
                onCheckedChange={(c) => setSpoilers(c === true)}
              />
              Contains spoilers
            </Label>
            <div className="flex items-center gap-2">
              {mine && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => del.mutate(mine.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button type="submit" disabled={upsert.isPending}>
                {mine ? "Update" : "Post"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          to leave a review.
        </p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r: any) => {
            const revealed = revealedSpoilers[r.id];
            const showText = !r.contains_spoilers || revealed;
            return (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {r.profiles?.username ? (
                      <Link
                        to="/profile/$username"
                        params={{ username: r.profiles.username }}
                        className="font-medium hover:underline"
                      >
                        {r.profiles.username}
                      </Link>
                    ) : (
                      <span className="font-medium">Unknown</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span>{r.rating}/10</span>
                  </div>
                </div>
                {r.text && (
                  <div className="mt-2 text-sm">
                    {showText ? (
                      <p className="whitespace-pre-wrap">{r.text}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedSpoilers((prev) => ({ ...prev, [r.id]: true }))
                        }
                        className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/10"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Contains spoilers — click to reveal
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}