"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractPostingAction } from "@/lib/actions/wizard";
import { applyPostingDetailsAction } from "@/lib/actions/posting-details";

export function PostingDetailsCard({
  applicationId,
  postingUrl,
}: {
  applicationId: string;
  postingUrl: string | null;
}) {
  const router = useRouter();
  // Whether the user has explicitly chosen to paste instead of fetching --
  // separate from "should the fetch option show", which is derived fresh
  // from the postingUrl prop below so it reacts if a link is added later.
  const [forcedPaste, setForcedPaste] = useState(false);
  const showFetch = Boolean(postingUrl) && !forcedPaste;
  const [pastedText, setPastedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(input: { url?: string; pastedText?: string }) {
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const extracted = await extractPostingAction(input);
      if (!extracted.ok) {
        setError(extracted.error);
        if (input.url) setForcedPaste(true); // fall back to paste on a failed fetch
        return;
      }
      const applied = await applyPostingDetailsAction(applicationId, extracted.data);
      if (!applied.ok) {
        setError(applied.error);
        return;
      }
      // A warning means part of the result didn't apply -- show it instead
      // of refreshing immediately, since refreshing removes this card the
      // moment descriptionText is set and the warning would never be seen.
      if (applied.warning) {
        setWarning(applied.warning);
        return;
      }
      router.refresh();
    });
  }

  function handlePasteSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pastedText.trim()) return;
    run({ pastedText: pastedText.trim() });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
      <div>
        <h3 className="text-[13px] font-semibold">Add posting details</h3>
        <p className="text-[13px] text-muted-foreground">
          This application doesn&apos;t have a job description yet — add one to unlock fit scoring and AI
          tailoring.
        </p>
      </div>

      {warning ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground">{warning}</p>
          <Button type="button" size="sm" onClick={() => router.refresh()}>
            Continue
          </Button>
        </div>
      ) : showFetch ? (
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" onClick={() => run({ url: postingUrl! })} disabled={isPending}>
            {isPending ? "Fetching…" : "Fetch from posting link"}
          </Button>
          <button
            type="button"
            className="text-[13px] text-muted-foreground hover:underline"
            onClick={() => setForcedPaste(true)}
          >
            Paste it instead
          </button>
        </div>
      ) : (
        <form onSubmit={handlePasteSubmit} className="flex flex-col gap-2">
          <Textarea
            rows={8}
            placeholder="Paste the full job posting text here…"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            required
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Reading…" : "Add posting details"}
          </Button>
        </form>
      )}

      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
