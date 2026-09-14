import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

// The route imports the shared `@/lib/prisma` singleton, which reads
// DATABASE_URL at construction time. Vitest doesn't load .env files
// automatically (unlike Next.js), so load it -- and mock auth -- before
// dynamically importing the route, so both are in place before any of its
// static imports evaluate.
if (!process.env.DATABASE_URL) {
  process.loadEnvFile();
}

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { GET, POST } = await import("./route");
const { auth } = await import("@/lib/auth");

const prisma = new PrismaClient();
const FIXTURES_DIR = path.join(__dirname, "..", "..", "..", "lib", "resume", "__fixtures__");

// Buffer's backing ArrayBufferLike admits SharedArrayBuffer, which BlobPart
// (used by `new File([...])` below) rejects; `new Uint8Array(buf)` copies
// the bytes but TS still infers Uint8Array<ArrayBufferLike>, not
// Uint8Array<ArrayBuffer> -- readFile's result is always a real,
// non-shared ArrayBuffer, so the cast is safe.
function toBlobPart(buf: Buffer): Uint8Array<ArrayBuffer> {
  return new Uint8Array(buf) as Uint8Array<ArrayBuffer>;
}

async function loadFixture(name: string): Promise<Uint8Array<ArrayBuffer>> {
  return toBlobPart(await readFile(path.join(FIXTURES_DIR, name)));
}

function uploadRequest(file: File): Request {
  const formData = new FormData();
  formData.set("file", file);
  return new Request("http://localhost/api/resume", { method: "POST", body: formData });
}

function mockSession(userId: string | null) {
  const session = userId ? { user: { id: userId } } : null;
  // auth() is one overload of NextAuth's multi-signature `auth` export;
  // `vi.mocked` otherwise infers the (unrelated) middleware overload's
  // return type for mockResolvedValue's argument.
  vi.mocked(auth).mockResolvedValue(session as never);
}

const userIds: string[] = [];

beforeEach(() => {
  vi.mocked(auth).mockReset();
});

afterEach(async () => {
  // Cascades to any UserResume row created off these users.
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  userIds.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function makeUser() {
  const user = await prisma.user.create({
    data: {
      email: `upload-route-test-${crypto.randomUUID()}@example.com`,
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

describe("POST /api/resume", () => {
  it("rejects with 401 when there is no session", async () => {
    mockSession(null);
    const bytes = await loadFixture("normal.pdf");
    const file = new File([bytes], "resume.pdf", { type: "application/pdf" });

    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(401);
  });

  it("rejects with 400 when no file is provided", async () => {
    const user = await makeUser();
    mockSession(user.id);

    const response = await POST(
      new Request("http://localhost/api/resume", { method: "POST", body: new FormData() })
    );

    expect(response.status).toBe(400);
  });

  it("rejects with 400 for a file whose content isn't PDF or DOCX, regardless of filename/MIME", async () => {
    const user = await makeUser();
    mockSession(user.id);

    // Named and labeled as a PDF, but the actual bytes are neither PDF nor
    // zip magic bytes -- content, not extension or browser-reported MIME,
    // must be what decides this (§4 step 1).
    const file = new File(["definitely not a real pdf"], "resume.pdf", {
      type: "application/pdf",
    });

    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/unrecognized file type/i);

    expect(await prisma.userResume.findUnique({ where: { userId: user.id } })).toBeNull();
  });

  it("rejects with 400 a file over the 5MB size limit", async () => {
    const user = await makeUser();
    mockSession(user.id);

    const oversized = toBlobPart(
      Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(5 * 1024 * 1024)])
    );
    const file = new File([oversized], "big.pdf", { type: "application/pdf" });

    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/too large/i);

    expect(await prisma.userResume.findUnique({ where: { userId: user.id } })).toBeNull();
  });

  it("rejects with 422 and writes no row on a hard parse failure (reject-on-failure path)", async () => {
    const user = await makeUser();
    mockSession(user.id);

    // Passes the magic-byte check (starts with the PDF signature) but is
    // structurally not a real PDF, so pdf-parse throws -- this must reject
    // outright and must not leave any row behind (§4's "never save whatever
    // we got" rule -- the one behavior most tempting to skip).
    const corruptButPdfTagged = toBlobPart(
      Buffer.concat([
        Buffer.from("%PDF-1.4\n"),
        Buffer.from("this is not valid PDF content after the header"),
      ])
    );
    const file = new File([corruptButPdfTagged], "resume.pdf", { type: "application/pdf" });

    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(422);

    expect(await prisma.userResume.findUnique({ where: { userId: user.id } })).toBeNull();
  });

  it("accepts a normal PDF, parses it OK, and upserts a UserResume row scoped to the session's user", async () => {
    const user = await makeUser();
    mockSession(user.id);

    const bytes = await loadFixture("normal.pdf");
    const file = new File([bytes], "my-resume.pdf", { type: "application/pdf" });

    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.parseStatus).toBe("OK");
    expect(body.warning).toBeNull();
    expect(body.wordCount).toBeGreaterThan(0);

    const row = await prisma.userResume.findUnique({ where: { userId: user.id } });
    expect(row).not.toBeNull();
    expect(row?.parseStatus).toBe("OK");
    expect(row?.originalFilename).toBe("my-resume.pdf");
    expect(row?.fileType).toBe("PDF");
    expect(row?.extractedText).toContain("Hello resume parser test content.");
  });

  it("accepts a normal .docx and upserts a UserResume row", async () => {
    const user = await makeUser();
    mockSession(user.id);

    const bytes = await loadFixture("normal.docx");
    const file = new File([bytes], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(200);

    const row = await prisma.userResume.findUnique({ where: { userId: user.id } });
    expect(row?.fileType).toBe("DOCX");
    expect(row?.parseStatus).toBe("OK");
  });

  it("saves a LOW_CONFIDENCE result with its warning rather than rejecting it", async () => {
    const user = await makeUser();
    mockSession(user.id);

    const bytes = await loadFixture("image-only.pdf");
    const file = new File([bytes], "scanned.pdf", { type: "application/pdf" });

    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.parseStatus).toBe("LOW_CONFIDENCE");
    expect(body.warning).toMatch(/didn't extract any text/i);

    const row = await prisma.userResume.findUnique({ where: { userId: user.id } });
    expect(row?.parseStatus).toBe("LOW_CONFIDENCE");
    expect(row?.parseWarning).toMatch(/didn't extract any text/i);
  });

  it("replaces the existing resume on a second upload rather than creating a second row", async () => {
    const user = await makeUser();
    mockSession(user.id);

    const first = await loadFixture("normal.pdf");
    await POST(uploadRequest(new File([first], "first.pdf", { type: "application/pdf" })));

    const second = await loadFixture("normal.docx");
    const response = await POST(
      uploadRequest(
        new File([second], "second.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      )
    );
    expect(response.status).toBe(200);

    const rows = await prisma.userResume.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].originalFilename).toBe("second.docx");
    expect(rows[0].fileType).toBe("DOCX");
  });
});

describe("GET /api/resume", () => {
  it("rejects with 401 when there is no session", async () => {
    mockSession(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("rejects with 404 when the session's user has no resume on file", async () => {
    const user = await makeUser();
    mockSession(user.id);

    const response = await GET();

    expect(response.status).toBe(404);
  });

  it("returns the original file bytes with a Content-Disposition header naming the file", async () => {
    const user = await makeUser();
    mockSession(user.id);

    const bytes = await loadFixture("normal.pdf");
    await POST(uploadRequest(new File([bytes], "my-resume.pdf", { type: "application/pdf" })));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain('filename="my-resume.pdf"');

    const downloaded = new Uint8Array(await response.arrayBuffer());
    expect(downloaded).toEqual(bytes);
  });

  it("returns only the requesting session's own resume, never another user's", async () => {
    const owner = await makeUser();
    mockSession(owner.id);
    const bytes = await loadFixture("normal.pdf");
    await POST(uploadRequest(new File([bytes], "owners-resume.pdf", { type: "application/pdf" })));

    const otherUser = await makeUser();
    mockSession(otherUser.id);

    const response = await GET();

    // otherUser has no resume of their own -- 404, never owner's file.
    expect(response.status).toBe(404);
  });
});
