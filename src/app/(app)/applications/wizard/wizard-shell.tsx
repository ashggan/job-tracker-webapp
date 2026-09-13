"use client";

import { useState } from "react";
import { cn } from "cn";
import { StepPosting } from "./step-posting";
import { StepReview } from "./step-review";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";

const STEPS = ["Posting", "Review"] as const;
type Step = "posting" | "review";

export function WizardShell() {
  const [step, setStep] = useState<Step>("posting");
  const [extracted, setExtracted] = useState<ExtractedPosting | null>(null);

  const stepIndex = step === "posting" ? 0 : 1;

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {STEPS.map((label, i) => (
          <li key={label} className={cn(i === stepIndex && "text-foreground")}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === "posting" && (
        <StepPosting
          onExtracted={(_postingUrl, data) => {
            setExtracted(data);
            setStep("review");
          }}
        />
      )}

      {step === "review" && extracted && (
        <StepReview extracted={extracted} onBack={() => setStep("posting")} />
      )}
    </div>
  );
}
