"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextVersion } from "@/lib/queries/tailored-documents";
import type { FitScore } from "@/lib/ai/score-fit";
import type { TailoredCv, TailoredCoverLetter } from "@/lib/ai/tailor-cv";

export type SaveElevatedMaterialsResult = { ok: true } | { ok: false; error: string };

// Saves the fit score + tailored materials produced by running an existing
// application through the elevate flow (src/app/(app)/applications/[id]/elevate).
// Unlike createApplicationFromWizardAction, this only ever updates an
// application that already exists -- it never touches stage, dateApplied,
// stageEvents, or notes, and a null fit (the user hit "Skip fit scoring")
// leaves whatever fit data is already there untouched rather than clearing it.
export async function saveElevatedMaterialsAction(
  applicationId: string,
  fit: FitScore | null,
  cv: TailoredCv | null,
  coverLetter: TailoredCoverLetter | null
): Promise<SaveElevatedMaterialsResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
  });
  if (!application) return { ok: false, error: "Application not found" };

  try {
    await prisma.$transaction(async (tx) => {
      if (fit) {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            fitScore: fit.fitScore,
            fitLabel: fit.fitLabel,
            fitStrengths: fit.fitStrengths,
            fitGaps: fit.fitGaps,
            fitRecommendation: fit.fitRecommendation,
            fitGeneratedAt: new Date(),
          },
        });
      }

      if (cv) {
        const version = await getNextVersion(applicationId, "cv");
        await tx.tailoredDocument.create({
          data: { applicationId, kind: "cv", version, contentJson: cv },
        });
      }

      if (coverLetter) {
        const version = await getNextVersion(applicationId, "cover_letter");
        await tx.tailoredDocument.create({
          data: { applicationId, kind: "cover_letter", version, contentJson: coverLetter },
        });
      }
    });
  } catch (error) {
    console.error("[saveElevatedMaterialsAction]", error);
    return { ok: false, error: "Couldn't save these results — try again in a moment" };
  }

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true };
}
