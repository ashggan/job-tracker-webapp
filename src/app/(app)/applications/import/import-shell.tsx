"use client";

import { useState } from "react";
import { cn } from "cn";
import { StepUpload } from "./step-upload";
import { StepReview } from "./step-review";
import type { ImportReviewRow } from "@/lib/actions/import-applications";

const STEPS = ["Upload", "Review"] as const;
const STEP_KEYS = ["upload", "review"] as const;
type Step = (typeof STEP_KEYS)[number];

export function ImportShell() {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportReviewRow[]>([]);
  const [truncated, setTruncated] = useState(false);

  const stepIndex = STEP_KEYS.indexOf(step);

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {STEPS.map((label, i) => (
          <li key={label} className={cn(i === stepIndex && "text-foreground")}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === "upload" && (
        <StepUpload
          onUploaded={(cleaned, wasTruncated) => {
            setRows(cleaned);
            setTruncated(wasTruncated);
            setStep("review");
          }}
        />
      )}

      {step === "review" && (
        <div className="flex flex-col gap-3">
          {truncated && (
            <p className="text-[13px] text-muted-foreground">
              This file had more rows than we could process at once — only the first batch is shown below.
            </p>
          )}
          <StepReview rows={rows} onBack={() => setStep("upload")} />
        </div>
      )}
    </div>
  );
}
