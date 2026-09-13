"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FitBadge } from "@/components/fit-badge";
import { scoreFitAction } from "@/lib/actions/wizard";
import type { FitScore } from "@/lib/ai/score-fit";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";

export function StepFitScore({
  extracted,
  onBack,
  onContinue,
}: {
  extracted: ExtractedPosting;
  onBack: () => void;
  onContinue: (fit: FitScore | null) => void;
}) {
  const [fit, setFit] = useState<FitScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    scoreFitAction({
      jobTitle: extracted.jobTitle,
      company: extracted.company,
      descriptionText: extracted.description,
      requirements: extracted.requirements,
      niceToHaves: extracted.niceToHaves,
    }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFit(result.data);
    });
    return () => {
      cancelled = true;
    };
    // Runs once per posting — the fields below don't change while this step is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" aria-busy="true">
        Scoring your fit for this role…
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
        {error.toLowerCase().includes("profile") && (
          <Link href="/profile" className="text-[13px] text-foreground underline">
            Go to Profile
          </Link>
        )}
        <div className="flex items-center gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" size="lg" onClick={() => onContinue(null)}>
            Skip fit scoring
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <FitBadge label={fit!.fitLabel} />
        <span className="text-sm font-semibold">{fit!.fitScore}/10</span>
      </div>

      <p className="text-[13px] text-muted-foreground">{fit!.fitRecommendation}</p>

      {fit!.fitStrengths.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Strengths
          </span>
          <ul className="flex flex-col gap-1 text-[13px]">
            {fit!.fitStrengths.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {fit!.fitGaps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Gaps
          </span>
          <ul className="flex flex-col gap-1 text-[13px]">
            {fit!.fitGaps.map((g) => (
              <li key={g}>• {g}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" size="lg" onClick={() => onContinue(fit)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
