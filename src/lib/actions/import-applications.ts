"use server";

import { revalidatePath } from "next/cache";
import type { Stage } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectSpreadsheetType, parseSpreadsheetFile, MAX_FILE_SIZE_BYTES } from "@/lib/import/parse-spreadsheet";
import { cleanImportedApplications, type ImportedApplicationRow } from "@/lib/ai/clean-imported-applications";
import { findDuplicateApplicationsForBatch, findWithinBatchDuplicates, type DuplicateMatch } from "@/lib/duplicate-check";
import { parseOptionalDate } from "@/lib/dates";
import { STAGE_ORDER } from "@/lib/stages";

export type ImportReviewRow = ImportedApplicationRow & {
  duplicates: DuplicateMatch[];
  // Index of an earlier row in this same import that looks like the same
  // application -- unlike `duplicates`, there's no saved id to link to yet.
  duplicateOfRow: number | null;
  // Seeded false when a likely duplicate was found, true otherwise -- the
  // review step's per-row checkbox starts from this.
  included: boolean;
};

export type UploadCleanResult =
  | { ok: true; rows: ImportReviewRow[]; truncated: boolean }
  | { ok: false; error: string };

export async function uploadAndCleanApplicationsAction(formData: FormData): Promise<UploadCleanResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };
  const userId = session.user.id;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided" };
  }

  // §4-style order: content-based type check before the size limit, same as
  // the resume upload route.
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = detectSpreadsheetType(bytes);
  if (!type) {
    return { ok: false, error: "Unrecognized file type. Upload a .csv or .xlsx file." };
  }
  if (bytes.length > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "File is too large. Imports must be 5MB or smaller." };
  }

  const parsed = await parseSpreadsheetFile(bytes, type);
  if (!parsed || parsed.rows.length === 0) {
    return { ok: false, error: "Couldn't read this file — check it has a header row and at least one data row." };
  }

  const cleaned = await cleanImportedApplications(userId, parsed.headers, parsed.rows);
  if (!cleaned.ok) return { ok: false, error: cleaned.error };

  const candidates = cleaned.data.map((row) => ({
    postingUrl: row.postingUrl,
    company: row.company,
    jobTitle: row.jobTitle,
  }));
  const duplicateMatches = await findDuplicateApplicationsForBatch(userId, candidates);
  const withinBatchDuplicates = findWithinBatchDuplicates(candidates);

  const rows: ImportReviewRow[] = cleaned.data.map((row, i) => ({
    ...row,
    duplicates: duplicateMatches[i] ?? [],
    duplicateOfRow: withinBatchDuplicates[i],
    included: (duplicateMatches[i]?.length ?? 0) === 0 && withinBatchDuplicates[i] == null,
  }));

  return { ok: true, rows, truncated: parsed.truncated };
}

export type BulkSaveRow = {
  jobTitle: string;
  company: string;
  stage: string;
  postingUrl: string | null;
  location: string | null;
  dateApplied: string | null;
  deadline: string | null;
  note: string | null;
};

export type BulkSaveResult = { ok: true; count: number } | { ok: false; error: string };

export async function bulkSaveImportedApplicationsAction(rows: BulkSaveRow[]): Promise<BulkSaveResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use this feature" };
  const userId = session.user.id;

  if (rows.length === 0) return { ok: false, error: "Select at least one row to import" };

  type ValidatedRow = {
    jobTitle: string;
    company: string;
    stage: Stage;
    postingUrl: string | null;
    location: string | null;
    dateApplied: Date | null;
    deadline: Date | null;
    note: string | null;
  };

  const validated: ValidatedRow[] = [];
  for (const row of rows) {
    const jobTitle = row.jobTitle.trim();
    const company = row.company.trim();
    if (!jobTitle || !company) {
      return { ok: false, error: "Every row needs a job title and company" };
    }
    if (!STAGE_ORDER.includes(row.stage as Stage)) {
      return { ok: false, error: `Invalid stage: ${row.stage}` };
    }

    const dateApplied = parseOptionalDate(row.dateApplied);
    const deadline = parseOptionalDate(row.deadline);
    if (!dateApplied.ok || !deadline.ok) {
      return { ok: false, error: `Invalid date for ${jobTitle} at ${company} — use a format like 2026-12-15` };
    }

    validated.push({
      jobTitle,
      company,
      stage: row.stage as Stage,
      // A malformed URL is cleaned to null rather than rejecting the whole
      // row over a cosmetic field, same posture as the AI-cleaning step.
      postingUrl: row.postingUrl && /^https?:\/\//i.test(row.postingUrl) ? row.postingUrl : null,
      location: row.location,
      dateApplied: dateApplied.value,
      deadline: deadline.value,
      note: row.note,
    });
  }

  try {
    await prisma.$transaction(
      validated.map((row) =>
        prisma.application.create({
          data: {
            userId,
            jobTitle: row.jobTitle,
            company: row.company,
            postingUrl: row.postingUrl ?? undefined,
            location: row.location ?? undefined,
            source: "imported",
            stage: row.stage,
            dateApplied: row.dateApplied,
            deadline: row.deadline,
            stageEvents: { create: { fromStage: null, toStage: row.stage } },
            notes: row.note ? { create: [{ body: row.note }] } : undefined,
          },
        })
      )
    );
  } catch (error) {
    console.error("[bulkSaveImportedApplicationsAction]", error);
    return { ok: false, error: "Couldn't save these applications — try again in a moment" };
  }

  revalidatePath("/job-applications");
  return { ok: true, count: validated.length };
}
