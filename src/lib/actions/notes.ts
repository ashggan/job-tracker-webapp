"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const addNoteSchema = z.object({
  body: z.string().trim().min(1, "Enter a note").max(4000),
});

export type AddNoteState = { error?: string } | undefined;

export async function addNoteAction(
  applicationId: string,
  _prevState: AddNoteState,
  formData: FormData
): Promise<AddNoteState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = addNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
    select: { id: true },
  });
  if (!application) return { error: "Application not found" };

  await prisma.note.create({
    data: { applicationId, body: parsed.data.body },
  });

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/table");
}
