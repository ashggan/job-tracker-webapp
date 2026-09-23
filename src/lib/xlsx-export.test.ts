import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { renderApplicationsXlsx, type ExportableApplication } from "./xlsx-export";

function makeApplication(overrides: Partial<ExportableApplication>): ExportableApplication {
  return {
    id: "app_1",
    userId: "user_1",
    jobTitle: "Software Engineer",
    company: "Acme Corp",
    postingUrl: "https://example.com/job",
    location: "Remote",
    source: "manual",
    descriptionText: null,
    requirements: null,
    niceToHaves: null,
    deadline: null,
    rawListingId: null,
    stage: "applied",
    dateFound: new Date("2026-09-01T00:00:00Z"),
    dateApplied: new Date("2026-09-05T00:00:00Z"),
    fitScore: 80,
    fitLabel: "good",
    fitStrengths: null,
    fitGaps: null,
    fitRecommendation: null,
    fitGeneratedAt: null,
    interviewPrepNotes: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    notes: [],
    tailoredDocuments: [],
    ...overrides,
  } as ExportableApplication;
}

async function readBack(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  // exceljs's Buffer param type resolves against a different (nested)
  // @types/node than this file's Buffer -- same value at runtime, but two
  // distinct nominal types to the checker. See docx's bundled @types/node.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.getWorksheet("Applications")!;

  // The xlsx format has no concept of ExcelJS's in-memory column `key` --
  // it only stores letter/number positions -- so re-derive a header ->
  // column-index map from row 1 instead of relying on getCell(key).
  const headerIndex = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headerIndex.set(String(cell.value), colNumber);
  });

  function cell(header: string, rowNumber: number) {
    const colNumber = headerIndex.get(header);
    if (!colNumber) throw new Error(`No column header "${header}"`);
    return sheet.getRow(rowNumber).getCell(colNumber);
  }

  return { sheet, cell };
}

describe("renderApplicationsXlsx", () => {
  it("writes a header row and one row per application", async () => {
    const buffer = await renderApplicationsXlsx([
      makeApplication({ jobTitle: "Backend Engineer", company: "Acme Corp" }),
      makeApplication({ jobTitle: "Frontend Engineer", company: "Beta Inc" }),
    ]);
    const { sheet, cell } = await readBack(buffer);

    expect(sheet.rowCount).toBe(3);
    expect(cell("Job Title", 2).value).toBe("Backend Engineer");
    expect(cell("Company", 3).value).toBe("Beta Inc");
  });

  it("maps stage and fit label to their human-readable names", async () => {
    const buffer = await renderApplicationsXlsx([
      makeApplication({ stage: "under_review", fitLabel: "strong" }),
    ]);
    const { cell } = await readBack(buffer);

    expect(cell("Stage", 2).value).toBe("Under Review");
    expect(cell("Fit Label", 2).value).toBe("Strong");
  });

  it("flags which tailored documents exist for the application", async () => {
    const buffer = await renderApplicationsXlsx([
      makeApplication({
        tailoredDocuments: [{ id: "d1", kind: "cv" }],
      }),
    ]);
    const { cell } = await readBack(buffer);

    expect(cell("CV Tailored", 2).value).toBe("Yes");
    expect(cell("Cover Letter Tailored", 2).value).toBe("No");
    expect(cell("Prep Notes", 2).value).toBe("No");
  });

  it("writes the posting URL as a hyperlink", async () => {
    const buffer = await renderApplicationsXlsx([
      makeApplication({ postingUrl: "https://example.com/job" }),
    ]);
    const { cell } = await readBack(buffer);

    expect(cell("Posting URL", 2).hyperlink).toBe("https://example.com/job");
  });

  it("produces an empty sheet (header only) with no applications", async () => {
    const buffer = await renderApplicationsXlsx([]);
    const { sheet } = await readBack(buffer);
    expect(sheet.rowCount).toBe(1);
  });
});
