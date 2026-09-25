"use client";

import { useState } from "react";
import { cn } from "cn";
import { StepPosting } from "./step-posting";
import { StepReview } from "./step-review";
import { StepDuplicateCheck, DEFAULT_EXTRAS, type GenerationExtras } from "./step-duplicate-check";
import { StepFitScore } from "./step-fit-score";
import { StepMaterials } from "./step-materials";
import { StepSave } from "./step-save";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";
import type { FitScore } from "@/lib/ai/score-fit";
import type { TailoredCv, TailoredCoverLetter } from "@/lib/ai/tailor-cv";
import { buildPostingSignature } from "@/lib/wizard/posting-signature";
import { STEPS, STEP_KEYS, type Step } from "@/lib/wizard/steps";

// Fields a step generates via AI and can legitimately come back without
// (skipped, or re-fetched on remount and not yet resolved/failed) — as
// opposed to postingUrl/extracted, which a step only ever hands back
// complete. Steps update this only through mergeGenerated below, so a
// null/absent field from a re-visited step can never erase a value a
// previous visit already produced.
//
// The `...For` fields record the posting signature (see
// buildPostingSignature) each result was generated against, so a user who
// goes Back, edits the posting, then forward again gets fresh results
// instead of stale ones computed against the old posting — see the
// initialFit/initialCv/initialCoverLetter props below.
type GeneratedState = {
  fit: FitScore | null;
  fitFor: string | null;
  cv: TailoredCv | null;
  cvFor: string | null;
  coverLetter: TailoredCoverLetter | null;
  coverLetterFor: string | null;
};

export function WizardShell() {
  const [step, setStep] = useState<Step>("posting");
  const [postingUrl, setPostingUrl] = useState<string | undefined>();
  const [extracted, setExtracted] = useState<ExtractedPosting | null>(null);
  const [extras, setExtras] = useState<GenerationExtras | null>(null);
  const [generated, setGenerated] = useState<GeneratedState>({
    fit: null,
    fitFor: null,
    cv: null,
    cvFor: null,
    coverLetter: null,
    coverLetterFor: null,
  });

  function mergeGenerated(patch: Partial<GeneratedState>) {
    setGenerated((prev) => {
      const next = { ...prev };
      (Object.keys(patch) as (keyof GeneratedState)[]).forEach((key) => {
        const value = patch[key];
        // Safe: value always came from patch[key] for this same key — TS
        // just can't verify that correlation through a generic keyof loop.
        if (value != null) (next as Record<keyof GeneratedState, unknown>)[key] = value;
      });
      return next;
    });
  }

  const stepIndex = STEP_KEYS.indexOf(step);
  const postingSignature = extracted ? buildPostingSignature(extracted) : null;

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
          postingUrl={postingUrl}
          onBack={() => setStep("posting")}
          onContinue={(reviewed, url) => {
            setExtracted(reviewed);
            setPostingUrl(url);
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
          onContinue={(selectedExtras) => {
            setExtras(selectedExtras);
            setStep("fit");
          }}
        />
      )}

      {step === "fit" && extracted && (
        <StepFitScore
          extracted={extracted}
          initialFit={generated.fitFor === postingSignature ? generated.fit : null}
          onBack={() => setStep("duplicate")}
          onContinue={(scored) => {
            // Only stamp the signature when a result actually came back --
            // otherwise (fit scoring skipped/failed) this would tag the
            // still-stale generated.fit as fresh for the current posting.
            mergeGenerated({ fit: scored, fitFor: scored ? postingSignature : null });
            setStep("materials");
          }}
        />
      )}

      {step === "materials" && extracted && (
        <StepMaterials
          extracted={extracted}
          wantsCoverLetter={extras?.wantsCoverLetter ?? true}
          initialCv={generated.cvFor === postingSignature ? generated.cv : null}
          initialCoverLetter={generated.coverLetterFor === postingSignature ? generated.coverLetter : null}
          onBack={() => setStep("fit")}
          onContinue={(materials) => {
            // Same reasoning as fitFor above -- only stamp the signature
            // for a field that actually generated successfully this visit.
            mergeGenerated({
              cv: materials.cv,
              cvFor: materials.cv ? postingSignature : null,
              coverLetter: materials.coverLetter,
              coverLetterFor: materials.coverLetter ? postingSignature : null,
            });
            setStep("save");
          }}
        />
      )}

      {step === "save" && extracted && (
        <StepSave
          postingUrl={postingUrl}
          extracted={extracted}
          fit={generated.fit}
          cv={generated.cv}
          coverLetter={generated.coverLetter}
          extras={extras ?? DEFAULT_EXTRAS}
          onBack={() => setStep("materials")}
        />
      )}
    </div>
  );
}
