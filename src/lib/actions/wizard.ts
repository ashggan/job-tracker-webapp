"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveKey } from "@/lib/ai/keys";
import { fetchPostingText, extractPostingDetails, type ExtractedPosting } from "@/lib/ai/extract-posting";
import { findDuplicateApplications, type DuplicateMatch } from "@/lib/duplicate-check";
import { scoreFit, type ScoreFitResult, type ScoreFitInput, type FitScore } from "@/lib/ai/score-fit";
import {
  tailorCv,
  tailorCoverLetter,
  type TailorCvResult,
  type TailorCoverLetterResult,
  type TailoredCv,
  type TailoredCoverLetter,
} from "@/lib/ai/tailor-cv";
import { renderTailoredDocumentDocx } from "@/lib/docx-export";
import { generatePrepNotes } from "@/lib/ai/generate-prep-notes";
import { generatePerksSummary } from "@/lib/ai/generate-perks-summary";
import type { GenerationExtras } from "@/app/(app)/applications/wizard/step-duplicate-check";
import type { TailoredKind } from "@prisma/client";

export type ExtractPostingActionResult =
  | { ok: true; data: ExtractedPosting }
  | { ok: false; error: string };

export async function extractPostingAction(input: {
  url?: string;
  pastedText?: string;
}): Promise<ExtractPostingActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };

  const resolved = await resolveActiveKey(session.user.id);
  if (!resolved) {
    return { ok: false, error: "Add an API key in Settings before using this feature" };
  }

  let sourceText = input.pastedText?.trim();
  if (!sourceText && input.url) {
    sourceText = (await fetchPostingText(input.url)) ?? undefined;
    if (!sourceText) {
      return {
        ok: false,
        error: "Couldn't read that page — try pasting the job description instead",
      };
    }
  }
  if (!sourceText) {
    return { ok: false, error: "Enter a posting link or paste the description" };
  }

  return extractPostingDetails(session.user.id, sourceText);
}

export type CheckDuplicatesActionResult =
  | { ok: true; data: DuplicateMatch[] }
  | { ok: false; error: string };

export async function checkDuplicatesAction(input: {
  postingUrl?: string;
  jobTitle: string;
  company: string;
}): Promise<CheckDuplicatesActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };

  const data = await findDuplicateApplications(session.user.id, input);
  return { ok: true, data };
}

export async function scoreFitAction(input: ScoreFitInput): Promise<ScoreFitResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };

  return scoreFit(session.user.id, input);
}

export async function tailorCvAction(input: ScoreFitInput): Promise<TailorCvResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };

  return tailorCv(session.user.id, input);
}

export async function tailorCoverLetterAction(input: ScoreFitInput): Promise<TailorCoverLetterResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };

  return tailorCoverLetter(session.user.id, input);
}

export type RenderMaterialDocxResult =
  | { ok: true; base64: string; filename: string }
  | { ok: false; error: string };

export async function renderMaterialDocxAction(input: {
  kind: TailoredKind;
  contentJson: unknown;
}): Promise<RenderMaterialDocxResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };

  try {
    const buffer = await renderTailoredDocumentDocx(input.kind, input.contentJson);
    return {
      ok: true,
      base64: buffer.toString("base64"),
      filename: input.kind === "cv" ? "cv.docx" : "cover-letter.docx",
    };
  } catch (error) {
    console.error("[renderMaterialDocxAction]", error);
    return { ok: false, error: "Couldn't generate that document" };
  }
}

export type SaveApplicationInput = {
  postingUrl?: string;
  extracted: ExtractedPosting;
  fit: FitScore | null;
  cv: TailoredCv | null;
  coverLetter: TailoredCoverLetter | null;
  extras: GenerationExtras;
};

function toScoreFitInput(extracted: ExtractedPosting): ScoreFitInput {
  return {
    jobTitle: extracted.jobTitle,
    company: extracted.company,
    descriptionText: extracted.description,
    requirements: extracted.requirements,
    niceToHaves: extracted.niceToHaves,
  };
}

// The Deadline field in step-review.tsx is freeform text (a placeholder hint,
// not enforced format), so a value like "ASAP" must be caught here rather
// than handed to Prisma raw — an invalid Date would otherwise fail the whole
// save transaction with a generic, unhelpful error.
function parseDeadline(raw: string | null): { ok: true; value: Date | null } | { ok: false } {
  if (!raw) return { ok: true, value: null };
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? { ok: false } : { ok: true, value: date };
}

export async function createApplicationFromWizardAction(
  input: SaveApplicationInput
): Promise<{ error: string } | undefined> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to use this feature" };
  const userId = session.user.id;

  const deadline = parseDeadline(input.extracted.deadline);
  if (!deadline.ok) {
    return {
      error: "Deadline isn't a valid date — go back to Review and use a format like 2026-12-15, or clear it",
    };
  }

  // Best-effort, outside the transaction since these are slow AI calls — a
  // failure here must not block saving the application itself.
  const scoreFitInput = toScoreFitInput(input.extracted);
  const [prepNotesResult, perksResult] = await Promise.all([
    input.extras.wantsPrepNotes ? generatePrepNotes(userId, scoreFitInput, input.fit) : null,
    input.extras.wantsPerks ? generatePerksSummary(userId, scoreFitInput) : null,
  ]);
  if (prepNotesResult && !prepNotesResult.ok) console.error("[generatePrepNotes]", prepNotesResult.error);
  if (perksResult && !perksResult.ok) console.error("[generatePerksSummary]", perksResult.error);

  try {
    await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          userId,
          jobTitle: input.extracted.jobTitle,
          company: input.extracted.company,
          postingUrl: input.postingUrl,
          location: input.extracted.location,
          source: "guided",
          descriptionText: input.extracted.description,
          requirements: input.extracted.requirements,
          niceToHaves: input.extracted.niceToHaves,
          deadline: deadline.value,
          stage: "wishlist",
          fitScore: input.fit?.fitScore,
          fitLabel: input.fit?.fitLabel,
          fitStrengths: input.fit?.fitStrengths,
          fitGaps: input.fit?.fitGaps,
          fitRecommendation: input.fit?.fitRecommendation,
          fitGeneratedAt: input.fit ? new Date() : null,
        },
      });

      await tx.stageEvent.create({
        data: { applicationId: application.id, fromStage: null, toStage: "wishlist" },
      });

      if (input.cv) {
        await tx.tailoredDocument.create({
          data: { applicationId: application.id, kind: "cv", version: 1, contentJson: input.cv },
        });
      }
      if (input.coverLetter) {
        await tx.tailoredDocument.create({
          data: {
            applicationId: application.id,
            kind: "cover_letter",
            version: 1,
            contentJson: input.coverLetter,
          },
        });
      }
      if (prepNotesResult?.ok) {
        await tx.tailoredDocument.create({
          data: {
            applicationId: application.id,
            kind: "prep_notes",
            version: 1,
            contentJson: { markdown: prepNotesResult.markdown },
          },
        });
      }
      if (perksResult?.ok) {
        await tx.tailoredDocument.create({
          data: {
            applicationId: application.id,
            kind: "perks",
            version: 1,
            contentJson: { markdown: perksResult.markdown },
          },
        });
      }
      if (input.extras.wantsExtraNote && input.fit) {
        await tx.note.create({
          data: {
            applicationId: application.id,
            body:
              `Fit: ${input.fit.fitScore}/10 — ${input.fit.fitRecommendation}\n\n` +
              `Strengths:\n${input.fit.fitStrengths.map((s) => `- ${s}`).join("\n")}\n\n` +
              `Gaps:\n${input.fit.fitGaps.map((g) => `- ${g}`).join("\n")}`,
          },
        });
      }
    });
  } catch (error) {
    console.error("[createApplicationFromWizardAction]", error);
    return { error: "Couldn't save this application — try again in a moment" };
  }

  revalidatePath("/board");
  revalidatePath("/table");
  redirect("/board");
}
