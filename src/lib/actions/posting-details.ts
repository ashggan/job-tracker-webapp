"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOptionalDate } from "@/lib/dates";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";

export type ApplyPostingDetailsResult = { ok: true } | { ok: false; error: string };

// Backfills descriptionText/requirements/niceToHaves/keywords onto an
// application that didn't get them at creation (manual add, bulk import) --
// the fields every AI function (fit score, tailoring) actually reads.
// Never overwrites a location/deadline the application already has.
export async function applyPostingDetailsAction(
  applicationId: string,
  extracted: ExtractedPosting
): Promise<ApplyPostingDetailsResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
  });
  if (!application) return { ok: false, error: "Application not found" };

  const deadline = parseOptionalDate(extracted.deadline);

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      descriptionText: extracted.description,
      requirements: extracted.requirements,
      niceToHaves: extracted.niceToHaves,
      keywords: extracted.keywords,
      location: application.location ?? extracted.location ?? undefined,
      deadline: !application.deadline && deadline.ok && deadline.value ? deadline.value : undefined,
    },
  });

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true };
}
