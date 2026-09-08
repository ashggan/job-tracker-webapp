"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Stage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { STAGE_ORDER } from "@/lib/stages";

const createApplicationSchema = z.object({
  jobTitle: z.string().trim().min(1, "Enter a job title").max(200),
  company: z.string().trim().min(1, "Enter a company").max(200),
  postingUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^https?:\/\//i.test(v), "Posting link must start with http:// or https://"),
  location: z.string().trim().max(200).optional(),
});

export type CreateApplicationState = { error?: string } | undefined;

export async function createApplicationAction(
  _prevState: CreateApplicationState,
  formData: FormData
): Promise<CreateApplicationState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = createApplicationSchema.safeParse({
    jobTitle: formData.get("jobTitle"),
    company: formData.get("company"),
    postingUrl: formData.get("postingUrl") || undefined,
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const application = await prisma.application.create({
    data: {
      userId: session.user.id,
      jobTitle: parsed.data.jobTitle,
      company: parsed.data.company,
      postingUrl: parsed.data.postingUrl,
      location: parsed.data.location,
      source: "manual",
      stage: "wishlist",
    },
  });

  await prisma.stageEvent.create({
    data: { applicationId: application.id, fromStage: null, toStage: "wishlist" },
  });

  redirect("/board");
}

export async function updateStageAction(applicationId: string, toStage: Stage) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!STAGE_ORDER.includes(toStage)) {
    throw new Error("Invalid stage");
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
  });
  if (!application) throw new Error("Application not found");
  if (application.stage === toStage) return;

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: toStage,
        dateApplied:
          application.dateApplied ?? (toStage === "applied" ? new Date() : application.dateApplied),
      },
    }),
    prisma.stageEvent.create({
      data: { applicationId, fromStage: application.stage, toStage },
    }),
  ]);

  revalidatePath("/board");
  revalidatePath("/table");
}

export async function deleteApplicationAction(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.application.deleteMany({
    where: { id: applicationId, userId: session.user.id },
  });

  revalidatePath("/board");
  revalidatePath("/table");
}
