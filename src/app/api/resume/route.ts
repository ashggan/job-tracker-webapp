import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseResume } from "@/lib/resume/parse-resume";
import { extractBasicInfo } from "@/lib/ai/extract-basic-info";
import { Prisma, ResumeFileType, type ResumeParseStatus } from "@prisma/client";

// §4: reject anything over 5MB before attempting to parse it.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const PDF_MAGIC = Buffer.from("%PDF-", "latin1");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04" -- .docx is a zip

// File type is determined from content, never from the extension or the
// browser-reported MIME type -- a mislabeled or malicious file renamed to
// .pdf must be caught here, not handed to a parser that trusts its input.
function detectFileType(bytes: Buffer): ResumeFileType | null {
  if (bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) return ResumeFileType.PDF;
  if (bytes.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC)) return ResumeFileType.DOCX;
  return null;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const CONTENT_TYPE_BY_FILE_TYPE: Record<ResumeFileType, string> = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Strips characters that could break out of the quoted-string in the
// Content-Disposition header (originalFilename is user-supplied at upload
// time, so it isn't safe to interpolate as-is).
function sanitizeFilenameForHeader(name: string): string {
  return name.replace(/[\r\n"]/g, "").trim() || "resume";
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resume = await prisma.userResume.findUnique({ where: { userId } });
  if (!resume) {
    return NextResponse.json({ error: "No resume on file." }, { status: 404 });
  }

  // Returns the original file bytes, not the extracted text -- the user
  // uploaded a formatted resume, they should get the same formatted resume
  // back (§3).
  return new Response(resume.fileBytes, {
    headers: {
      "Content-Type": CONTENT_TYPE_BY_FILE_TYPE[resume.fileType],
      "Content-Disposition": `attachment; filename="${sanitizeFilenameForHeader(resume.originalFilename)}"`,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  // Every read/write is scoped to the authenticated user's own row, derived
  // from the session -- never from a client-supplied user id (§1).
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // §4 order: file type (by content) is checked before the size limit.
  const fileBytes = Buffer.from(await file.arrayBuffer());
  const fileType = detectFileType(fileBytes);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unrecognized file type. Upload a PDF or .docx file." },
      { status: 400 }
    );
  }

  if (fileBytes.length > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Resumes must be 5MB or smaller." },
      { status: 400 }
    );
  }

  const parseResult = await parseResume(fileBytes, fileType, fileBytes.length);

  // A hard parse failure must not silently succeed -- reject outright,
  // write nothing. No UserResume row is ever left in a FAILED state (§4).
  if (parseResult.status === "FAILED") {
    return NextResponse.json(
      { error: "Couldn't read this file. Try a different export of the same resume." },
      { status: 422 }
    );
  }

  const parseStatus: ResumeParseStatus = parseResult.status;
  const parseWarning = parseResult.status === "LOW_CONFIDENCE" ? parseResult.warning : null;

  // Best-effort only -- never blocks or fails the upload. Returns null with
  // no API key configured, on a provider error, or on timeout; the resume
  // is already good to save by this point regardless.
  const basicInfo = await extractBasicInfo(userId, parseResult.text);

  // Always an upsert keyed on userId, never a bare create -- one CV per
  // user, and a single write with no window where the user has no resume
  // on file if it fails partway (§4).
  const resume = await prisma.userResume.upsert({
    where: { userId },
    create: {
      userId,
      originalFilename: file.name,
      fileType,
      fileBytes,
      fileSizeBytes: fileBytes.length,
      extractedText: parseResult.text,
      parseStatus,
      parseWarning,
      basicInfo: basicInfo ?? undefined,
    },
    update: {
      originalFilename: file.name,
      fileType,
      fileBytes,
      fileSizeBytes: fileBytes.length,
      extractedText: parseResult.text,
      parseStatus,
      parseWarning,
      // Overwritten (not merged) on every upload -- a derived cache, not an
      // editable field. Reset to null on a stale/failed extraction rather
      // than leaving the previous resume's info attached to this one.
      basicInfo: basicInfo ?? Prisma.JsonNull,
    },
  });

  return NextResponse.json({
    filename: resume.originalFilename,
    parseStatus: resume.parseStatus,
    warning: resume.parseWarning,
    wordCount: wordCount(parseResult.text),
    basicInfo: resume.basicInfo,
  });
}
