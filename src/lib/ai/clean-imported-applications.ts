import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { wrapUntrustedBlock } from "@/lib/ai/untrusted-content";
import { logUsage } from "@/lib/ai/tailor-cv";

// Mirrors the Stage enum's values (prisma/schema.prisma) -- hardcoded rather
// than derived, same convention as fitScoreSchema's fitLabel enum in
// score-fit.ts.
const STAGE_VALUES = [
  "wishlist",
  "applied",
  "under_review",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export const importedApplicationRowSchema = z.object({
  // Echoed back unchanged from the input row index -- lets the caller detect
  // a row the model silently dropped or reordered, since nothing else ties
  // an output row back to the source data it came from.
  sourceRowIndex: z.number().int(),
  jobTitle: z.string(),
  company: z.string(),
  stage: z.enum(STAGE_VALUES),
  postingUrl: z.string().nullable(),
  location: z.string().nullable(),
  dateApplied: z.string().nullable(), // ISO date (YYYY-MM-DD), or null if absent/unparseable
  deadline: z.string().nullable(), // ISO date (YYYY-MM-DD), or null if absent/unparseable
  note: z.string().nullable(), // freeform text (Notes/Comments-style column) that doesn't fit another field
});

export type ImportedApplicationRow = z.infer<typeof importedApplicationRowSchema>;

export type CleanImportResult =
  | { ok: true; data: ImportedApplicationRow[] }
  | { ok: false; error: string };

// Same "cap what's fed to the model" instinct as extract-posting.ts's
// MAX_SOURCE_TEXT_CHARS -- a defensive backstop on top of the row cap
// parseSpreadsheetFile already enforces, in case a handful of very wide rows
// still add up to an unreasonable prompt.
const MAX_TABLE_CHARS = 40_000;

function serializeTable(headers: string[], rows: string[][]): string {
  const lines = rows.map((row, i) => {
    const fields = headers
      .map((header, c) => `${header || `Column ${c + 1}`}: ${row[c] ?? ""}`)
      .join(" | ");
    return `Row ${i}: ${fields}`;
  });
  return lines.join("\n").slice(0, MAX_TABLE_CHARS);
}

export async function cleanImportedApplications(
  userId: string,
  headers: string[],
  rows: string[][]
): Promise<CleanImportResult> {
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { object, usage } = await generateObject({
      model,
      schema: z.object({ applications: z.array(importedApplicationRowSchema) }),
      prompt:
        "Clean and structure this imported job-application spreadsheet. Map whatever columns " +
        "exist onto: jobTitle, company, stage, postingUrl, location, dateApplied, deadline, " +
        "note. Normalize stage into exactly one of wishlist/applied/under_review/interview/" +
        "offer/rejected/withdrawn: \"phone screen\"/\"technical interview\"/\"onsite\" → " +
        "interview; \"offer received\"/\"offer extended\" → offer; \"rejected\"/\"no\"/" +
        "\"declined\" → rejected; \"withdrew\" → withdrawn; \"in review\"/\"reviewing\"/" +
        "\"screening\" → under_review; blank/\"saved\"/\"to apply\" → wishlist; anything else " +
        "indicating the application was actually submitted → applied. Default to wishlist only " +
        "when genuinely unclear. Normalize any date to ISO format YYYY-MM-DD, or null if it " +
        "can't be parsed or is absent. Skip rows that are entirely blank. Put any freeform " +
        "notes/comments text that doesn't fit another field into `note`. Every row you include " +
        "must echo back its original Row number as sourceRowIndex, unchanged.\n\n" +
        wrapUntrustedBlock("imported_spreadsheet", serializeTable(headers, rows)),
      abortSignal: AbortSignal.timeout(60_000),
    });

    await logUsage(userId, "import_applications", resolved.provider, usage.totalTokens ?? 0);

    // Tolerant-but-logged, same posture as stripFabricatedContent: an
    // out-of-range/hallucinated sourceRowIndex is dropped rather than
    // trusted, and a row the model silently omitted is reported, but neither
    // fails the whole import. A repeated sourceRowIndex is dropped too (past
    // the first occurrence) -- otherwise a hallucinated duplicate index would
    // reach the review table as two rows for the same source data.
    const validIndex = (i: number) => i >= 0 && i < rows.length;
    const seen = new Set<number>();
    const applications = object.applications.filter((row) => {
      if (!validIndex(row.sourceRowIndex)) {
        console.warn("[cleanImportedApplications] dropped row with out-of-range sourceRowIndex:", row.sourceRowIndex);
        return false;
      }
      if (seen.has(row.sourceRowIndex)) {
        console.warn("[cleanImportedApplications] dropped row with duplicate sourceRowIndex:", row.sourceRowIndex);
        return false;
      }
      seen.add(row.sourceRowIndex);
      return true;
    });

    const missing = rows.map((_, i) => i).filter((i) => !seen.has(i));
    if (missing.length > 0) {
      console.warn("[cleanImportedApplications] rows dropped by the model:", missing);
    }

    return { ok: true, data: applications };
  } catch (error) {
    console.error("[cleanImportedApplications]", error);
    return {
      ok: false,
      error: "Couldn't read this spreadsheet — try again in a moment",
    };
  }
}
