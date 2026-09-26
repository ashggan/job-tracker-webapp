"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StepFitScore } from "@/app/(app)/applications/wizard/step-fit-score";
import { StepMaterials } from "@/app/(app)/applications/wizard/step-materials";
import { saveElevatedMaterialsAction } from "@/lib/actions/elevate-application";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";
import type { FitScore } from "@/lib/ai/score-fit";
import type { TailoredCv, TailoredCoverLetter } from "@/lib/ai/tailor-cv";

type Step = "fit" | "materials";

export function ElevateShell({
  applicationId,
  extracted,
}: {
  applicationId: string;
  extracted: ExtractedPosting;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("fit");
  const [fit, setFit] = useState<FitScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(materials: { cv: TailoredCv | null; coverLetter: TailoredCoverLetter | null }) {
    setError(null);
    startTransition(async () => {
      const result = await saveElevatedMaterialsAction(applicationId, fit, materials.cv, materials.coverLetter);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/applications/${applicationId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {step === "fit" && (
        <StepFitScore
          extracted={extracted}
          onBack={() => router.push(`/applications/${applicationId}`)}
          onContinue={(scored) => {
            setFit(scored);
            setStep("materials");
          }}
        />
      )}

      {step === "materials" && (
        <StepMaterials
          extracted={extracted}
          wantsCoverLetter={true}
          onBack={() => setStep("fit")}
          onContinue={handleSave}
        />
      )}

      {isPending && (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          Saving…
        </p>
      )}
      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
