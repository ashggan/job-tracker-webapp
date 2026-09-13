"use client";

import { useState } from "react";
import { cn } from "cn";
import { StepPosting } from "./step-posting";
import { StepReview } from "./step-review";
import { StepDuplicateCheck } from "./step-duplicate-check";
import { StepFitScore } from "./step-fit-score";
import { StepMaterials } from "./step-materials";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";

const STEPS = ["Posting", "Review", "Check", "Fit", "Materials"] as const;
const STEP_KEYS = ["posting", "review", "duplicate", "fit", "materials"] as const;
type Step = (typeof STEP_KEYS)[number];

export function WizardShell() {
  const [step, setStep] = useState<Step>("posting");
  const [postingUrl, setPostingUrl] = useState<string | undefined>();
  const [extracted, setExtracted] = useState<ExtractedPosting | null>(null);

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

      {step === "posting" && (
        <StepPosting
          onExtracted={(url, data) => {
            setPostingUrl(url);
            setExtracted(data);
            setStep("review");
          }}
        />
      )}

      {step === "review" && extracted && (
        <StepReview
          extracted={extracted}
          onBack={() => setStep("posting")}
          onContinue={(reviewed) => {
            setExtracted(reviewed);
            setStep("duplicate");
          }}
        />
      )}

      {step === "duplicate" && extracted && (
        <StepDuplicateCheck
          postingUrl={postingUrl}
          jobTitle={extracted.jobTitle}
          company={extracted.company}
          onBack={() => setStep("review")}
          onContinue={() => setStep("fit")}
        />
      )}

      {step === "fit" && extracted && (
        <StepFitScore
          extracted={extracted}
          onBack={() => setStep("duplicate")}
          onContinue={() => setStep("materials")}
        />
      )}

      {step === "materials" && extracted && (
        <StepMaterials
          extracted={extracted}
          onBack={() => setStep("fit")}
          onContinue={() => {
            // Save & track step (plan PR #11) wires in here next.
          }}
        />
      )}
    </div>
  );
}
