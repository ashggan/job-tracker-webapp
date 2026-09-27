import { prisma } from "@/lib/prisma";
import type { TailoredKind, Prisma } from "@prisma/client";

export async function getLatestTailoredDocument(applicationId: string, kind: TailoredKind) {
  return prisma.tailoredDocument.findFirst({
    where: { applicationId, kind },
    orderBy: { version: "desc" },
  });
}

// Accepts an interactive-transaction client so a caller wrapping this read
// and the document it creates in the same $transaction actually gets one
// atomic read-then-write -- otherwise this read runs on its own connection,
// outside the caller's transaction entirely, and can race with a concurrent
// call for the same applicationId+kind.
export async function getNextVersion(
  applicationId: string,
  kind: TailoredKind,
  client: typeof prisma | Prisma.TransactionClient = prisma
): Promise<number> {
  const latest = await client.tailoredDocument.findFirst({
    where: { applicationId, kind },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
}
