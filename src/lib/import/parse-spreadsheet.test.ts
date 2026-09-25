import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  detectSpreadsheetType,
  parseSpreadsheetFile,
  MAX_ROWS,
} from "./parse-spreadsheet";

async function buildXlsx(rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("detectSpreadsheetType", () => {
  it("recognizes an .xlsx file by its zip magic bytes", async () => {
    const bytes = await buildXlsx([["Job Title"], ["Engineer"]]);
    expect(detectSpreadsheetType(bytes)).toBe("xlsx");
  });

  it("treats plain text as a CSV candidate", () => {
    const bytes = Buffer.from("Job Title,Company\nEngineer,Acme\n", "utf8");
    expect(detectSpreadsheetType(bytes)).toBe("csv");
  });

  it("rejects binary content that isn't a recognized spreadsheet format", () => {
    const bytes = Buffer.from([0x00, 0x01, 0x02, 0xff, 0x00, 0xfe]);
    expect(detectSpreadsheetType(bytes)).toBeNull();
  });
});

describe("parseSpreadsheetFile (xlsx)", () => {
  it("extracts headers and rows, dropping entirely-blank rows", async () => {
    const bytes = await buildXlsx([
      ["Job Title", "Company", "Stage"],
      ["Engineer", "Acme", "Applied"],
      ["", "", ""],
      ["Designer", "Beta", "Interview"],
    ]);

    const result = await parseSpreadsheetFile(bytes, "xlsx");
    expect(result?.headers).toEqual(["Job Title", "Company", "Stage"]);
    expect(result?.rows).toEqual([
      ["Engineer", "Acme", "Applied"],
      ["Designer", "Beta", "Interview"],
    ]);
    expect(result?.truncated).toBe(false);
  });

  it("formats a Date cell as an ISO date string", async () => {
    const bytes = await buildXlsx([["Applied"], [new Date("2026-01-15T00:00:00.000Z")]]);
    const result = await parseSpreadsheetFile(bytes, "xlsx");
    expect(result?.rows).toEqual([["2026-01-15"]]);
  });

  it("truncates and flags rows beyond MAX_ROWS", async () => {
    const dataRows = Array.from({ length: MAX_ROWS + 20 }, (_, i) => [`Row ${i}`]);
    const bytes = await buildXlsx([["Job Title"], ...dataRows]);

    const result = await parseSpreadsheetFile(bytes, "xlsx");
    expect(result?.rows).toHaveLength(MAX_ROWS);
    expect(result?.truncated).toBe(true);
  });
});

describe("parseSpreadsheetFile (csv)", () => {
  it("extracts headers and rows from a raw CSV string", async () => {
    const csv = "Job Title,Company,Stage\nEngineer,Acme,Applied\n,,\nDesigner,Beta,Interview\n";
    const result = await parseSpreadsheetFile(Buffer.from(csv, "utf8"), "csv");
    expect(result?.headers).toEqual(["Job Title", "Company", "Stage"]);
    expect(result?.rows).toEqual([
      ["Engineer", "Acme", "Applied"],
      ["Designer", "Beta", "Interview"],
    ]);
  });

  it("returns null for a file with no usable header row", async () => {
    const result = await parseSpreadsheetFile(Buffer.from("", "utf8"), "csv");
    expect(result).toBeNull();
  });
});

describe("parseSpreadsheetFile (malformed input)", () => {
  it("returns null instead of throwing when the bytes aren't a real xlsx file", async () => {
    const result = await parseSpreadsheetFile(Buffer.from("not an xlsx file"), "xlsx");
    expect(result).toBeNull();
  });
});
