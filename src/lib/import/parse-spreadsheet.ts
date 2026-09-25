import ExcelJS from "exceljs";
import { Readable } from "stream";

export type SpreadsheetType = "xlsx" | "csv";

export type ParsedSpreadsheet = {
  headers: string[];
  rows: string[][];
  // True when the file had more than MAX_ROWS data rows and the tail was
  // dropped rather than silently importing an incomplete-looking result.
  truncated: boolean;
};

// §4-style cap, same limit as the resume upload in src/app/api/resume/route.ts
// -- checked by the caller (the upload action) before this is ever called.
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const MAX_ROWS = 500;

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04" -- .xlsx is a zip

// How many leading bytes to sniff for a null byte when deciding whether an
// unrecognized file could plausibly be CSV text at all.
const TEXT_SNIFF_BYTES = 2000;

function looksLikeText(bytes: Buffer): boolean {
  return !bytes.subarray(0, TEXT_SNIFF_BYTES).includes(0);
}

// File type is determined from content, never from the extension or the
// browser-reported MIME type -- same rule as detectFileType in
// src/app/api/resume/route.ts. CSV has no reliable magic bytes, so it's a
// fallback guess for anything that isn't a recognizable binary format;
// parseSpreadsheetFile rejects it outright if it doesn't actually parse.
export function detectSpreadsheetType(bytes: Buffer): SpreadsheetType | null {
  if (bytes.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC)) return "xlsx";
  return looksLikeText(bytes) ? "csv" : null;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    // Rich-text/hyperlink/formula-result cell objects -- prefer their
    // resolved text over "[object Object]".
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    return "";
  }
  return String(value).trim();
}

function extractRows(worksheet: ExcelJS.Worksheet): ParsedSpreadsheet | null {
  const headerRow = worksheet.getRow(1);
  const columnCount = headerRow.cellCount;
  if (columnCount === 0) return null;

  const headers: string[] = [];
  for (let c = 1; c <= columnCount; c++) {
    headers.push(cellToString(headerRow.getCell(c).value));
  }
  if (headers.every((h) => h === "")) return null;

  const rows: string[][] = [];
  let truncated = false;
  for (let r = 2; r <= worksheet.rowCount; r++) {
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
    const row = worksheet.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= columnCount; c++) {
      cells.push(cellToString(row.getCell(c).value));
    }
    if (cells.every((v) => v === "")) continue; // drop entirely-blank rows
    rows.push(cells);
  }

  return { headers, rows, truncated };
}

// Never throws -- a corrupt/unparseable file (or one that just doesn't have
// a usable header row) is reported as null, same convention as parseResume
// in src/lib/resume/parse-resume.ts.
export async function parseSpreadsheetFile(
  bytes: Buffer,
  type: SpreadsheetType
): Promise<ParsedSpreadsheet | null> {
  try {
    const workbook = new ExcelJS.Workbook();
    let worksheet: ExcelJS.Worksheet | undefined;
    if (type === "xlsx") {
      // node_modules/@fast-csv/{format,parse} (exceljs's own CSV deps) bundle
      // an older @types/node whose `Buffer` predates the project's newer
      // Buffer<ArrayBufferLike> generic -- a type-only mismatch (real Buffer
      // at runtime either way), not a bug in the bytes being passed here.
      await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
      worksheet = workbook.worksheets[0];
    } else {
      worksheet = await workbook.csv.read(Readable.from(bytes as unknown as Uint8Array));
    }
    if (!worksheet) return null;
    return extractRows(worksheet);
  } catch {
    return null;
  }
}
