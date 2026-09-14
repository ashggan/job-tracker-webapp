import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assessConfidence, parseResume } from "./parse-resume";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

async function loadFixture(name: string): Promise<Buffer> {
  return readFile(path.join(FIXTURES_DIR, name));
}

describe("parseResume", () => {
  it("extracts full text from a normal, text-based PDF", async () => {
    const bytes = await loadFixture("normal.pdf");
    const result = await parseResume(bytes, "PDF", bytes.length);

    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    // The fixture wraps onto multiple lines, so compare with whitespace
    // (including the line breaks) collapsed rather than asserting on exact
    // line boundaries.
    expect(result.text.replace(/\s+/g, " ")).toBe(
      "Hello resume parser test content. This is a normal, text-based fixture used to verify the parser extracts real text correctly."
    );
  });

  it("extracts full text from a normal .docx", async () => {
    const bytes = await loadFixture("normal.docx");
    const result = await parseResume(bytes, "DOCX", bytes.length);

    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    expect(result.text).toContain("Hello resume parser test content.");
    expect(result.text).toContain("extracts real text correctly.");
  });

  it("flags a scanned/image-only PDF (no text layer) as LOW_CONFIDENCE", async () => {
    const bytes = await loadFixture("image-only.pdf");
    const result = await parseResume(bytes, "PDF", bytes.length);

    expect(result.status).toBe("LOW_CONFIDENCE");
    if (result.status !== "LOW_CONFIDENCE") return;
    expect(result.text).toBe("");
    expect(result.warning).toMatch(/didn't extract any text/i);
  });

  it("reports FAILED, not a throw, for a corrupt/non-PDF file passed as PDF", async () => {
    const bytes = Buffer.from("this is not a pdf at all, just plain bytes");
    const result = await parseResume(bytes, "PDF", bytes.length);

    expect(result).toEqual({ status: "FAILED" });
  });

  it("reports FAILED, not a throw, for a corrupt/non-DOCX file passed as DOCX", async () => {
    const bytes = Buffer.from("this is not a docx at all, just plain bytes");
    const result = await parseResume(bytes, "DOCX", bytes.length);

    expect(result).toEqual({ status: "FAILED" });
  });
});

describe("assessConfidence", () => {
  it("is OK for text with plausible density and no garbled characters", () => {
    const text = "A normal resume with plenty of real, readable text content.";
    const result = assessConfidence(text, 500);

    expect(result).toEqual({ status: "OK", text });
  });

  it("flags empty extracted text as LOW_CONFIDENCE", () => {
    const result = assessConfidence("   \n\n  ", 1000);

    expect(result.status).toBe("LOW_CONFIDENCE");
    if (result.status !== "LOW_CONFIDENCE") return;
    expect(result.text).toBe("");
    expect(result.warning).toMatch(/didn't extract any text/i);
  });

  it("flags implausibly sparse text relative to file size as LOW_CONFIDENCE", () => {
    // 20 chars of text out of a 50,000-byte file is far below the density
    // floor -- the classic signature of a scanned/image-only PDF.
    const result = assessConfidence("just a little text", 50_000);

    expect(result.status).toBe("LOW_CONFIDENCE");
    if (result.status !== "LOW_CONFIDENCE") return;
    expect(result.warning).toMatch(/didn't extract much text/i);
  });

  it("flags text dominated by replacement/control characters as LOW_CONFIDENCE", () => {
    const garbled = "������ normal text ������";
    const result = assessConfidence(garbled, garbled.length);

    expect(result.status).toBe("LOW_CONFIDENCE");
    if (result.status !== "LOW_CONFIDENCE") return;
    expect(result.warning).toMatch(/didn't extract cleanly/i);
  });
});
