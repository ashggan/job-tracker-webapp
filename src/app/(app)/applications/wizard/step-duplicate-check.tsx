"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { checkDuplicatesAction } from "@/lib/actions/wizard";
import { STAGE_LABELS } from "@/lib/stages";
import type { DuplicateMatch } from "@/lib/duplicate-check";

export function StepDuplicateCheck({
  postingUrl,
  jobTitle,
  company,
  onBack,
  onContinue,
}: {
  postingUrl?: string;
  jobTitle: string;
  company: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkDuplicatesAction({ postingUrl, jobTitle, company }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMatches(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [postingUrl, jobTitle, company]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  if (matches === null) {
    return (
      <p className="text-sm text-muted-foreground" aria-busy="true">
        Checking for existing applications…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {matches.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No matching applications found — this looks new.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground">
            {matches.length === 1
              ? "You already have an application that looks like this one:"
              : `You already have ${matches.length} applications that look like this one:`}
          </p>
          <ul className="flex flex-col gap-2">
            {matches.map((match) => (
              <li key={match.id} className="rounded-lg border border-border px-3 py-2 text-[13px]">
                <span className="font-semibold">{match.jobTitle}</span> at {match.company} —{" "}
                {STAGE_LABELS[match.stage]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" size="lg" onClick={onContinue}>
          {matches.length === 0 ? "Continue" : "Continue anyway"}
        </Button>
      </div>
    </div>
  );
}
