"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { tailorCvAction, tailorCoverLetterAction, renderMaterialDocxAction } from "@/lib/actions/wizard";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";
import type { TailoredCv, TailoredCoverLetter } from "@/lib/ai/tailor-cv";
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

function MaterialSection({
  label,
  loading,
  loadingText,
  error,
  onRegenerate,
  onDownload,
  downloading,
  children,
}: {
  label: string;
  loading: boolean;
  loadingText: string;
  error: string | null;
  onRegenerate: () => void;
  onDownload: (() => void) | null;
  downloading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onRegenerate} disabled={loading}>
            Regenerate
          </Button>
          {onDownload && (
            <Button type="button" size="sm" onClick={onDownload} disabled={downloading}>
              {downloading ? "Preparing…" : "Download .docx"}
            </Button>
          )}
        </div>
      </div>
      {loading && (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          {loadingText}
        </p>
      )}
      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && children}
    </div>
  );
}

export function StepMaterials({
  extracted,
  onBack,
  onContinue,
}: {
  extracted: ExtractedPosting;
  onBack: () => void;
  onContinue: (materials: { cv: TailoredCv | null; coverLetter: TailoredCoverLetter | null }) => void;
}) {
  const [cv, setCv] = useState<TailoredCv | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [coverLetter, setCoverLetter] = useState<TailoredCoverLetter | null>(null);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [letterLoading, setLetterLoading] = useState(extracted.wantsCoverLetter);
  const [downloading, setDownloading] = useState<"cv" | "cover_letter" | null>(null);

  function applyCvResult(result: Awaited<ReturnType<typeof tailorCvAction>>) {
    setCvLoading(false);
    if (!result.ok) {
      setCvError(result.error);
      return;
    }
    setCv(result.data);
  }

  function applyCoverLetterResult(result: Awaited<ReturnType<typeof tailorCoverLetterAction>>) {
    setLetterLoading(false);
    if (!result.ok) {
      setLetterError(result.error);
      return;
    }
    setCoverLetter(result.data);
  }

  function generateCv() {
    setCvLoading(true);
    setCvError(null);
    tailorCvAction(toMaterialInput(extracted)).then(applyCvResult);
  }

  function generateCoverLetter() {
    setLetterLoading(true);
    setLetterError(null);
    tailorCoverLetterAction(toMaterialInput(extracted)).then(applyCoverLetterResult);
  }

  // Fetch on mount directly (rather than via generateCv/generateCoverLetter,
  // whose synchronous setState-true call would trigger cascading renders if
  // invoked from an effect) — cvLoading/letterLoading already start true.
  useEffect(() => {
    let cancelled = false;
    tailorCvAction(toMaterialInput(extracted)).then((result) => {
      if (!cancelled) applyCvResult(result);
    });
    if (extracted.wantsCoverLetter) {
      tailorCoverLetterAction(toMaterialInput(extracted)).then((result) => {
        if (!cancelled) applyCoverLetterResult(result);
      });
    }
    return () => {
      cancelled = true;
    };
    // Runs once when this step mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload(kind: "cv" | "cover_letter", content: unknown) {
    setDownloading(kind);
    await downloadDocx(kind, content);
    setDownloading(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <MaterialSection
        label="Tailored CV"
        loading={cvLoading}
        loadingText="Tailoring your CV…"
        error={cvError}
        onRegenerate={generateCv}
        onDownload={cv ? () => handleDownload("cv", cv) : null}
        downloading={downloading === "cv"}
      >
        {cv && (
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
      </MaterialSection>

      {extracted.wantsCoverLetter && (
        <MaterialSection
          label="Cover letter"
          loading={letterLoading}
          loadingText="Writing your cover letter…"
          error={letterError}
          onRegenerate={generateCoverLetter}
          onDownload={coverLetter ? () => handleDownload("cover_letter", coverLetter) : null}
          downloading={downloading === "cover_letter"}
        >
          {coverLetter && (
            <p className="whitespace-pre-line rounded-lg border border-border p-3 text-[13px]">
              {coverLetter.body}
            </p>
          )}
        </MaterialSection>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" size="lg" onClick={() => onContinue({ cv, coverLetter })}>
          Continue
        </Button>
      </div>
    </div>
  );
}
