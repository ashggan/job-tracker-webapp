import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import type { ResumeFileType } from "@prisma/client";

export type ParseResult =
  | { status: "OK"; text: string }
  | { status: "LOW_CONFIDENCE"; text: string; warning: string }
  | { status: "FAILED" };

// Fewer than this many extracted characters per byte of source file is a
// strong signal of a scanned/image-only PDF with no real text layer.
const MIN_CHARS_PER_BYTE = 0.01;

// A share of replacement/control characters above this points to a
// corrupted or encoding-broken extraction, not a real resume.
const MAX_GARBAGE_CHAR_RATIO = 0.05;

const GARBAGE_CHAR_PATTERN = /[�\x00-\x08\x0B\x0C\x0E-\x1F]/g;

const EMPTY_WARNING =
  "This didn't extract any text — if your file is a scanned image or has an unusual layout, try exporting a fresh copy from Word or Google Docs.";
const SPARSE_WARNING =
  "This didn't extract much text — if your PDF is a scanned image or has an unusual layout, try exporting a fresh copy from Word or Google Docs.";
const GARBLED_WARNING =
  "This resume didn't extract cleanly — the file may be corrupted or use an unusual encoding. Try exporting a fresh copy.";

// Exported for direct unit-testing of the confidence thresholds themselves --
// producing a real file that reliably trips the garbled-text branch through
// the full parser pipeline isn't practical, so that case is tested here.
export function assessConfidence(rawText: string, fileSizeBytes: number): ParseResult {
  const text = rawText.trim();

  if (text.length === 0) {
    return { status: "LOW_CONFIDENCE", text, warning: EMPTY_WARNING };
  }

  const density = text.length / fileSizeBytes;
  if (density < MIN_CHARS_PER_BYTE) {
    return { status: "LOW_CONFIDENCE", text, warning: SPARSE_WARNING };
  }

  const garbageChars = text.match(GARBAGE_CHAR_PATTERN)?.length ?? 0;
  if (garbageChars / text.length > MAX_GARBAGE_CHAR_RATIO) {
    return { status: "LOW_CONFIDENCE", text, warning: GARBLED_WARNING };
  }

  return { status: "OK", text };
}

async function extractPdfText(fileBytes: Buffer): Promise<string> {
  const parser = new PDFParse({ data: fileBytes });
  try {
    // pageJoiner: "" suppresses pdf-parse's default "-- page N of M --"
    // footer, which would otherwise count as extracted text on every page.
    const result = await parser.getText({ pageJoiner: "" });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(fileBytes: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: fileBytes });
  return result.value;
}

/**
 * Parses an uploaded resume file to plain text and assesses extraction
 * confidence. Never throws: a parser failure (corrupt file, wrong format,
 * password-protected doc, etc.) is reported as `{ status: "FAILED" }`
 * rather than propagated, per §4 of the resume feature spec — the caller
 * decides how to respond, but a hard failure must never produce a row.
 */
export async function parseResume(
  fileBytes: Buffer,
  fileType: ResumeFileType,
  fileSizeBytes: number
): Promise<ParseResult> {
  let rawText: string;
  try {
    rawText = fileType === "PDF" ? await extractPdfText(fileBytes) : await extractDocxText(fileBytes);
  } catch {
    return { status: "FAILED" };
  }

  return assessConfidence(rawText, fileSizeBytes);
}
