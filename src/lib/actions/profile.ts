"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { uploadResumeFile, deleteResumeFile } from "@/lib/storage";
import type { ResumeStructured } from "@/lib/profile";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type ActionState = { error?: string } | undefined;

export async function uploadResumeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload" };
  }
  if (!ALLOWED_RESUME_TYPES.has(file.type)) {
    return { error: "Only PDF or DOCX files are supported" };
  }
  if (file.size > MAX_RESUME_BYTES) {
    return { error: "File is too large — 10MB max" };
  }

  const existing = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  const key = await uploadResumeFile(session.user.id, file);

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, resumeFileUrl: key },
    update: { resumeFileUrl: key },
  });

  if (existing?.resumeFileUrl) {
    await deleteResumeFile(existing.resumeFileUrl).catch(() => {});
  }

  revalidatePath("/profile");
  return undefined;
}

export async function removeResumeAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!existing?.resumeFileUrl) return;

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { resumeFileUrl: null },
  });
  await deleteResumeFile(existing.resumeFileUrl).catch(() => {});

  revalidatePath("/profile");
}

const experienceEntrySchema = z.object({
  title: z.string().trim().max(200),
  company: z.string().trim().max(200),
  location: z.string().trim().max(200).optional(),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
  bullets: z.array(z.string().trim().min(1).max(500)).max(20),
});

const educationEntrySchema = z.object({
  school: z.string().trim().max(200),
  degree: z.string().trim().max(200).optional(),
  field: z.string().trim().max(200).optional(),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
});

const resumeStructuredSchema = z.object({
  contact: z.object({
    name: z.string().trim().max(200).optional(),
    email: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(60).optional(),
    location: z.string().trim().max(200).optional(),
    links: z.string().trim().max(500).optional(),
  }),
  summary: z.string().trim().max(2000).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(50),
  experience: z.array(experienceEntrySchema).max(20),
  education: z.array(educationEntrySchema).max(10),
});

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function parseExperienceRows(formData: FormData, count: number) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      title: field(formData, `experience.${i}.title`),
      company: field(formData, `experience.${i}.company`),
      location: field(formData, `experience.${i}.location`),
      startDate: field(formData, `experience.${i}.startDate`),
      endDate: field(formData, `experience.${i}.endDate`),
      bullets: field(formData, `experience.${i}.bullets`)
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean),
    });
  }
  return rows;
}

function parseEducationRows(formData: FormData, count: number) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      school: field(formData, `education.${i}.school`),
      degree: field(formData, `education.${i}.degree`),
      field: field(formData, `education.${i}.field`),
      startDate: field(formData, `education.${i}.startDate`),
      endDate: field(formData, `education.${i}.endDate`),
    });
  }
  return rows;
}

export async function updateResumeStructuredAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const experienceCount = Number(formData.get("experienceCount") ?? 0);
  const educationCount = Number(formData.get("educationCount") ?? 0);

  const experienceRows = parseExperienceRows(formData, experienceCount);
  const educationRows = parseEducationRows(formData, educationCount);

  const skills = field(formData, "skills")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const candidate = {
    contact: {
      name: field(formData, "contactName") || undefined,
      email: field(formData, "contactEmail") || undefined,
      phone: field(formData, "contactPhone") || undefined,
      location: field(formData, "contactLocation") || undefined,
      links: field(formData, "contactLinks") || undefined,
    },
    summary: field(formData, "summary") || undefined,
    skills,
    experience: experienceRows.filter((row) => row.title || row.company || row.bullets.length > 0),
    education: educationRows.filter((row) => row.school || row.degree || row.field),
  };

  const parsed = resumeStructuredSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, resumeStructured: parsed.data satisfies ResumeStructured },
    update: { resumeStructured: parsed.data satisfies ResumeStructured },
  });

  revalidatePath("/profile");
  return undefined;
}

const preferencesSchema = z.object({
  preferencesText: z.string().trim().max(5000),
});

export async function updatePreferencesAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = preferencesSchema.safeParse({
    preferencesText: formData.get("preferencesText"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, preferencesText: parsed.data.preferencesText },
    update: { preferencesText: parsed.data.preferencesText },
  });

  revalidatePath("/profile");
  return undefined;
}
