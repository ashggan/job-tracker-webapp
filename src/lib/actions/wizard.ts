"use server";

import { auth } from "@/lib/auth";
import { resolveActiveKey } from "@/lib/ai/keys";
import { fetchPostingText, extractPostingDetails, type ExtractedPosting } from "@/lib/ai/extract-posting";
import { findDuplicateApplications, type DuplicateMatch } from "@/lib/duplicate-check";
import { scoreFit, type ScoreFitResult, type ScoreFitInput } from "@/lib/ai/score-fit";
import { tailorCv, type TailorCvResult } from "@/lib/ai/tailor-cv";
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
