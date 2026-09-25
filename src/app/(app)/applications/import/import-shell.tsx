"use client";

import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { StepUpload } from "./step-upload";
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
          <p className="text-[13px] text-muted-foreground">
            {rows.length} application{rows.length === 1 ? "" : "s"} ready to review.
          </p>
          {/* Minimal placeholder — the next PR replaces this with the full
              per-row review table (include/exclude, Stage dropdown,
              duplicate details) and the bulk-save action. */}
          <ul className="flex flex-col gap-1 text-[13px]">
            {rows.map((row, i) => (
              <li key={i}>
                {row.jobTitle} at {row.company}
                {row.duplicates.length > 0 && (
                  <span className="text-muted-foreground"> — possible duplicate</span>
                )}
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" className="self-start" onClick={() => setStep("upload")}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
