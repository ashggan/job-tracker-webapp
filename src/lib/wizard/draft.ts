import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractedPostingWithDescriptionSchema, type ExtractedPosting } from "@/lib/ai/extract-posting";
import { fitScoreSchema, type FitScore } from "@/lib/ai/score-fit";
import { tailoredCvSchema, coverLetterSchema, type TailoredCv, type TailoredCoverLetter } from "@/lib/ai/tailor-cv";
import { STEP_KEYS, type Step } from "@/lib/wizard/steps";
import type { GenerationExtras } from "@/app/(app)/applications/wizard/step-duplicate-check";

const generationExtrasSchema = z.object({
  wantsCoverLetter: z.boolean(),
  wantsPrepNotes: z.boolean(),
  wantsExtraNote: z.boolean(),
  wantsPerks: z.boolean(),
});

export type WizardDraftData = {
  step: Step;
  postingUrl: string | undefined;
  extracted: ExtractedPosting;
  extras: GenerationExtras | null;
  fit: FitScore | null;
  fitFor: string | null;
  cv: TailoredCv | null;
  cvFor: string | null;
  coverLetter: TailoredCoverLetter | null;
  coverLetterFor: string | null;
};

function isValidStep(value: string): value is Step {
  return (STEP_KEYS as readonly string[]).includes(value);
}

// A draft's JSON columns were written by this same app, but a later code
// change (a schema field renamed/added) could still leave an old row that no
// longer parses -- validate against the schemas that already describe each
// shape rather than trusting stored JSON blindly. `extracted` is the one
// field every other field depends on (fit/materials are meaningless without
// it), so a bad `extracted` invalidates the whole draft; a bad
// fit/cv/coverLetter just drops that one piece.
export async function loadWizardDraft(userId: string): Promise<WizardDraftData | null> {
  const row = await prisma.wizardDraft.findUnique({ where: { userId } });
  if (!row) return null;

  const extracted = extractedPostingWithDescriptionSchema.safeParse(row.extracted);
  if (!extracted.success) {
    await discardWizardDraft(userId);
    return null;
  }

  const extras = generationExtrasSchema.safeParse(row.extras);
  const fit = fitScoreSchema.safeParse(row.fit);
  const cv = tailoredCvSchema.safeParse(row.cv);
  const coverLetter = coverLetterSchema.safeParse(row.coverLetter);

  return {
    step: isValidStep(row.step) ? row.step : "review",
    postingUrl: row.postingUrl ?? undefined,
    extracted: extracted.data,
    extras: extras.success ? extras.data : null,
    fit: fit.success ? fit.data : null,
    fitFor: fit.success ? row.fitFor : null,
    cv: cv.success ? cv.data : null,
    cvFor: cv.success ? row.cvFor : null,
    coverLetter: coverLetter.success ? coverLetter.data : null,
    coverLetterFor: coverLetter.success ? row.coverLetterFor : null,
  };
}

export async function saveWizardDraft(userId: string, data: WizardDraftData): Promise<void> {
  // Prisma's Json? columns need the sentinel Prisma.JsonNull to actually
  // store a JSON null -- passing a bare `null` is a type error (it would be
  // ambiguous with "don't touch this column").
  const shared = {
    step: data.step,
    postingUrl: data.postingUrl,
    extracted: data.extracted,
    extras: data.extras ?? Prisma.JsonNull,
    fit: data.fit ?? Prisma.JsonNull,
    fitFor: data.fitFor,
    cv: data.cv ?? Prisma.JsonNull,
    cvFor: data.cvFor,
    coverLetter: data.coverLetter ?? Prisma.JsonNull,
    coverLetterFor: data.coverLetterFor,
  };
  await prisma.wizardDraft.upsert({
    where: { userId },
    create: { userId, ...shared },
    update: shared,
  });
}

export async function discardWizardDraft(userId: string): Promise<void> {
  await prisma.wizardDraft.deleteMany({ where: { userId } });
}
