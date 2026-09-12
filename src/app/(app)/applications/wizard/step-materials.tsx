"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { tailorCvAction, renderMaterialDocxAction } from "@/lib/actions/wizard";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";
import type { TailoredCv } from "@/lib/ai/tailor-cv";
import type { ScoreFitInput } from "@/lib/ai/score-fit";

function toMaterialInput(extracted: ExtractedPosting): ScoreFitInput {
  return {
    jobTitle: extracted.jobTitle,
    company: extracted.company,
    descriptionText: extracted.description,
    requirements: extracted.requirements,
    niceToHaves: extracted.niceToHaves,
  };
}

async function downloadDocx(kind: "cv" | "cover_letter", content: unknown) {
  const result = await renderMaterialDocxAction({ kind, contentJson: content });
  if (!result.ok) return;

  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function StepMaterials({
  extracted,
  onBack,
  onContinue,
}: {
  extracted: ExtractedPosting;
  onBack: () => void;
  onContinue: (materials: { cv: TailoredCv | null }) => void;
}) {
  const [cv, setCv] = useState<TailoredCv | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  function applyCvResult(result: Awaited<ReturnType<typeof tailorCvAction>>) {
    setCvLoading(false);
    if (!result.ok) {
      setCvError(result.error);
      return;
    }
    setCv(result.data);
  }

  function generateCv() {
    setCvLoading(true);
    setCvError(null);
    tailorCvAction(toMaterialInput(extracted)).then(applyCvResult);
  }

  // Fetch on mount directly (rather than via generateCv, whose synchronous
  // setState-true call would trigger cascading renders if invoked from an
  // effect) — cvLoading already starts true.
  useEffect(() => {
    let cancelled = false;
    tailorCvAction(toMaterialInput(extracted)).then((result) => {
      if (!cancelled) applyCvResult(result);
    });
    return () => {
      cancelled = true;
    };
    // Runs once when this step mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload() {
    if (!cv) return;
    setDownloading(true);
    await downloadDocx("cv", cv);
    setDownloading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Tailored CV
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={generateCv} disabled={cvLoading}>
              Regenerate
            </Button>
            {cv && (
              <Button type="button" size="sm" onClick={handleDownload} disabled={downloading}>
                {downloading ? "Preparing…" : "Download .docx"}
              </Button>
            )}
          </div>
        </div>
        {cvLoading && (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            Tailoring your CV…
          </p>
        )}
        {cvError && (
          <p className="text-[13px] text-destructive" role="alert">
            {cvError}
          </p>
        )}
        {cv && !cvLoading && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-[13px]">
            <p>{cv.summary}</p>
            <ul className="flex flex-col gap-1">
              {cv.experienceBullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
            <p className="text-muted-foreground">{cv.skills.join(", ")}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" size="lg" onClick={() => onContinue({ cv })}>
          Continue
        </Button>
      </div>
    </div>
  );
}
