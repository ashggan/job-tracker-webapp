"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tailorCoverLetter } from "@/lib/ai/tailor-cv";
import { reviseCoverLetter } from "@/lib/ai/revise-cover-letter";
import { generateApplicationEmail, type ApplicationEmail } from "@/lib/ai/generate-application-email";
import { getNextVersion } from "@/lib/queries/tailored-documents";
import type { ScoreFitInput } from "@/lib/ai/score-fit";

async function getOwnedApplication(applicationId: string, userId: string) {
  return prisma.application.findFirst({ where: { id: applicationId, userId } });
}

function toScoreFitInput(app: {
  jobTitle: string;
  company: string;
  descriptionText: string | null;
  requirements: unknown;
  niceToHaves: unknown;
}): ScoreFitInput {
  return {
    jobTitle: app.jobTitle,
    company: app.company,
    descriptionText: app.descriptionText ?? "",
    requirements: (app.requirements as string[] | null) ?? [],
    niceToHaves: (app.niceToHaves as string[] | null) ?? [],
  };
}

export type TailorCoverLetterActionResult = { ok: true; body: string } | { ok: false; error: string };
export type RetailorCoverLetterActionResult =
  | { ok: true; body: string; docId: string }
  | { ok: false; error: string };

export async function retailorCoverLetterAction(applicationId: string): Promise<RetailorCoverLetterActionResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const application = await getOwnedApplication(applicationId, session.user.id);
  if (!application) return { ok: false, error: "Application not found" };

  const result = await tailorCoverLetter(session.user.id, toScoreFitInput(application));
  if (!result.ok) return result;

  const version = await getNextVersion(applicationId, "cover_letter");
  const doc = await prisma.tailoredDocument.create({
    data: { applicationId, kind: "cover_letter", version, contentJson: result.data },
  });

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true, body: result.data.body, docId: doc.id };
}

export type GenerateApplicationEmailActionResult =
  | { ok: true; data: ApplicationEmail; docId: string }
  | { ok: false; error: string };

// Used for both the first "Generate" and any later "Regenerate" -- each call
// creates a new version, same as retailorCoverLetterAction.
export async function generateApplicationEmailAction(
  applicationId: string
): Promise<GenerateApplicationEmailActionResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const application = await getOwnedApplication(applicationId, session.user.id);
  if (!application) return { ok: false, error: "Application not found" };

  const result = await generateApplicationEmail(session.user.id, toScoreFitInput(application));
  if (!result.ok) return result;

  const version = await getNextVersion(applicationId, "application_email");
  const doc = await prisma.tailoredDocument.create({
    data: { applicationId, kind: "application_email", version, contentJson: result.data },
  });

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true, data: result.data, docId: doc.id };
}

export async function reviseCoverLetterAction(
  applicationId: string,
  currentBody: string,
  instruction: string
): Promise<TailorCoverLetterActionResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const application = await getOwnedApplication(applicationId, session.user.id);
  if (!application) return { ok: false, error: "Application not found" };

  return reviseCoverLetter(session.user.id, currentBody, instruction);
}

export type SaveTailoredDocumentState = { error?: string } | undefined;

export async function updateTailoredDocumentContentAction(
  docId: string,
  body: string
): Promise<SaveTailoredDocumentState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const doc = await prisma.tailoredDocument.findFirst({
    where: { id: docId, application: { userId: session.user.id } },
  });
  if (!doc) return { error: "Document not found" };

  await prisma.tailoredDocument.update({
    where: { id: docId },
    data: { contentJson: { body } },
  });

  revalidatePath(`/applications/${doc.applicationId}`);
}
