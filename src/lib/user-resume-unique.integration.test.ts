import { afterAll, afterEach, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";

// PrismaClient reads DATABASE_URL when it's constructed. Unlike Next.js,
// vitest doesn't load .env files automatically, so load it before
// instantiating — this hits the real local Postgres (docker-compose), not a
// mock, because a unique constraint is enforced by the DB, not by app code.
if (!process.env.DATABASE_URL) {
  process.loadEnvFile();
}

const prisma = new PrismaClient();

describe("UserResume.userId unique constraint (DB layer)", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    // Cascades to any UserResume row created off these users.
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a second UserResume row for the same userId, even if app code bypasses upsert", async () => {
    const user = await prisma.user.create({
      data: {
        email: `unique-userid-test-${crypto.randomUUID()}@example.com`,
        passwordHash: "not-a-real-hash",
      },
    });
    userIds.push(user.id);

    await prisma.userResume.create({
      data: {
        userId: user.id,
        originalFilename: "resume.pdf",
        fileType: "PDF",
        fileBytes: Buffer.from("%PDF-1.4 test"),
        fileSizeBytes: 13,
        extractedText: "test resume text",
        parseStatus: "OK",
      },
    });

    let error: unknown;
    try {
      await prisma.userResume.create({
        data: {
          userId: user.id,
          originalFilename: "resume-2.pdf",
          fileType: "PDF",
          fileBytes: Buffer.from("%PDF-1.4 test 2"),
          fileSizeBytes: 15,
          extractedText: "second resume text",
          parseStatus: "OK",
        },
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    const knownError = error as Prisma.PrismaClientKnownRequestError;
    expect(knownError.code).toBe("P2002");
    expect(String(knownError.meta?.target)).toContain("userId");
  });
});
