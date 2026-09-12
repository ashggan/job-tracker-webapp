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
};

export async function createApplicationFromWizardAction(
  input: SaveApplicationInput
): Promise<{ error: string } | undefined> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          userId,
          jobTitle: input.extracted.jobTitle,
          company: input.extracted.company,
          postingUrl: input.postingUrl,
          source: "guided",
          descriptionText: input.extracted.description,
          requirements: input.extracted.requirements,
          niceToHaves: input.extracted.niceToHaves,
          deadline: input.extracted.deadline ? new Date(input.extracted.deadline) : null,
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
    });
  } catch (error) {
    console.error("[createApplicationFromWizardAction]", error);
    return { error: "Couldn't save this application — try again in a moment" };
  }

  revalidatePath("/board");
  revalidatePath("/table");
  redirect("/board");
}
