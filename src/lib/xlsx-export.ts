import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { STAGE_LABELS, FIT_META } from "@/lib/stages";

// Same include shape as getTableRows in src/lib/queries/applications.ts.
export type ExportableApplication = Prisma.ApplicationGetPayload<{
  include: {
    notes: true;
    tailoredDocuments: { select: { id: true; kind: true } };
  };
}>;

const COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: "Date Applied", key: "dateApplied", width: 14 },
  { header: "Job Title", key: "jobTitle", width: 32 },
  { header: "Company", key: "company", width: 24 },
  { header: "Source", key: "source", width: 16 },
  { header: "Posting URL", key: "postingUrl", width: 36 },
  { header: "Location", key: "location", width: 20 },
  { header: "Stage", key: "stage", width: 16 },
  { header: "Fit Score", key: "fitScore", width: 11 },
  { header: "Fit Label", key: "fitLabel", width: 12 },
  { header: "Deadline", key: "deadline", width: 14 },
  { header: "Date Found", key: "dateFound", width: 14 },
  { header: "CV Tailored", key: "cvTailored", width: 12 },
  { header: "Cover Letter Tailored", key: "coverLetterTailored", width: 18 },
  { header: "Prep Notes", key: "prepNotes", width: 12 },
  { header: "Latest Note", key: "latestNote", width: 40 },
];

const DATE_FORMAT = "yyyy-mm-dd";

export async function renderApplicationsXlsx(
  applications: ExportableApplication[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Applications", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };

  for (const app of applications) {
    const row = sheet.addRow({
      dateApplied: app.dateApplied,
      jobTitle: app.jobTitle,
      company: app.company,
      source: app.source === "manual" ? "Manual" : app.source,
      postingUrl: app.postingUrl,
      location: app.location,
      stage: STAGE_LABELS[app.stage],
      fitScore: app.fitScore,
      fitLabel: app.fitLabel ? FIT_META[app.fitLabel].label : null,
      deadline: app.deadline,
      dateFound: app.dateFound,
      cvTailored: app.tailoredDocuments.some((d) => d.kind === "cv") ? "Yes" : "No",
      coverLetterTailored: app.tailoredDocuments.some((d) => d.kind === "cover_letter")
        ? "Yes"
        : "No",
      prepNotes: app.tailoredDocuments.some((d) => d.kind === "prep_notes") ? "Yes" : "No",
      latestNote: app.notes[0]?.body ?? null,
    });

    for (const key of ["dateApplied", "deadline", "dateFound"] as const) {
      const cell = row.getCell(key);
      if (cell.value) cell.numFmt = DATE_FORMAT;
    }
    if (app.postingUrl) {
      row.getCell("postingUrl").value = { text: app.postingUrl, hyperlink: app.postingUrl };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
