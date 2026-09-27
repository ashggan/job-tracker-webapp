"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import type { FitLabel } from "@prisma/client";
import { FitBadge } from "@/components/fit-badge";
import { FitScoreForm } from "./fit-score-form";

export function FitScoreCard({
  applicationId,
  hasDescription,
  fitScore,
  fitLabel,
  fitStrengths,
  fitGaps,
  fitRecommendation,
}: {
  applicationId: string;
  hasDescription: boolean;
  fitScore: number | null;
  fitLabel: FitLabel | null;
  fitStrengths: string[];
  fitGaps: string[];
  fitRecommendation: string | null;
}) {
  const [editing, setEditing] = useState(fitLabel == null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl">Fit score</h3>
        <div className="flex items-center gap-3">
          {hasDescription && (
            <Link
              href={`/applications/${applicationId}/elevate`}
              className="text-[13px] font-semibold text-accent-foreground hover:underline"
            >
              Score & tailor with AI
            </Link>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-[13px] font-semibold text-accent-foreground hover:underline"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {editing ? (
        <FitScoreForm
          applicationId={applicationId}
          fitScore={fitScore}
          fitLabel={fitLabel}
          fitStrengths={fitStrengths}
          fitGaps={fitGaps}
          fitRecommendation={fitRecommendation}
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="font-heading text-5xl font-medium">{fitScore}</span>
            <FitBadge label={fitLabel} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Strengths
              </h4>
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {fitStrengths.map((s) => (
                  <li key={s} className="flex gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-good" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Gaps</h4>
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {fitGaps.map((g) => (
                  <li key={g} className="flex gap-1.5">
                    <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
