import { prisma } from "@/lib/prisma";
import type { TailoredKind } from "@prisma/client";

export async function getLatestTailoredDocument(applicationId: string, kind: TailoredKind) {
  return prisma.tailoredDocument.findFirst({
    where: { applicationId, kind },
    orderBy: { version: "desc" },
  });
}

export async function getNextVersion(applicationId: string, kind: TailoredKind): Promise<number> {
  const latest = await prisma.tailoredDocument.findFirst({
    where: { applicationId, kind },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
}
