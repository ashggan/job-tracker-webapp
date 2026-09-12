import { prisma } from "@/lib/prisma";
import type { Stage } from "@prisma/client";

export type DuplicateMatch = {
  id: string;
  company: string;
  jobTitle: string;
  stage: Stage;
  createdAt: Date;
};

// Lowercases the host, drops "www.", and strips the entire query string
// (tracking params like ?utm_source=... are the common case, but any query
// string is unlikely to be part of a job posting's real identity) and any
// trailing slash. Returns null for a URL that can't be parsed at all.
function normalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return null;
  }
}

export async function findDuplicateApplications(
  userId: string,
  candidate: { postingUrl?: string | null; company: string; jobTitle: string }
): Promise<DuplicateMatch[]> {
  const select = { id: true, company: true, jobTitle: true, stage: true, createdAt: true } as const;

  const normalizedTarget = candidate.postingUrl ? normalizeUrl(candidate.postingUrl) : null;
  if (normalizedTarget) {
    const withUrls = await prisma.application.findMany({
      where: { userId, postingUrl: { not: null } },
      select: { ...select, postingUrl: true },
    });
    const urlMatches = withUrls.filter(
      (row) => row.postingUrl && normalizeUrl(row.postingUrl) === normalizedTarget
    );
    if (urlMatches.length > 0) {
      return urlMatches.map((row) => ({
        id: row.id,
        company: row.company,
        jobTitle: row.jobTitle,
        stage: row.stage,
        createdAt: row.createdAt,
      }));
    }
  }

  return prisma.application.findMany({
    where: {
      userId,
      company: { equals: candidate.company.trim(), mode: "insensitive" },
      jobTitle: { equals: candidate.jobTitle.trim(), mode: "insensitive" },
    },
    select,
  });
}
