"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FitBadge } from "@/components/fit-badge";
import { createApplicationFromWizardAction } from "@/lib/actions/wizard";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";
import type { FitScore } from "@/lib/ai/score-fit";
import type { TailoredCv, TailoredCoverLetter } from "@/lib/ai/tailor-cv";

export function StepSave({
  postingUrl,
  extracted,
  fit,
  cv,
  coverLetter,
  onBack,
}: {
  postingUrl?: string;
  extracted: ExtractedPosting;
  fit: FitScore | null;
  cv: TailoredCv | null;
  coverLetter: TailoredCoverLetter | null;
  onBack: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await createApplicationFromWizardAction({ postingUrl, extracted, fit, cv, coverLetter });
      if (result?.error) setError(result.error);
      // On success the action redirects to /board — nothing else to do here.
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-[13px]">
        <p className="font-semibold">
          {extracted.jobTitle} at {extracted.company}
        </p>
        {fit && (
          <div className="flex items-center gap-2">
            <FitBadge label={fit.fitLabel} />
            <span>{fit.fitScore}/10</span>
          </div>
        )}
        <p className="text-muted-foreground">
          {cv ? "Tailored CV ready. " : "No tailored CV. "}
          {extracted.wantsCoverLetter && (coverLetter ? "Cover letter ready." : "Cover letter not generated.")}
        </p>
      </div>

      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button type="button" size="lg" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save & add to Wishlist"}
        </Button>
      </div>
    </div>
  );
}
