import { prisma } from "@/lib/prisma";
import type { Stage } from "@prisma/client";

export type DuplicateMatch = {
  id: string;
  company: string;
  jobTitle: string;
  stage: Stage;
  createdAt: Date;
};

// Known tracking params only — NOT a blanket query-string strip. Several ATS
// platforms encode the actual job/requisition id in a query param on an
// otherwise-generic path (Indeed ?jk=, Greenhouse ?gh_jid=, LinkedIn
// ?currentJobId=, Workday ?jobId=); stripping the whole query string made
// unrelated postings on the same board collapse to the same normalized key.
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "referrer",
  "source",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

// Lowercases the host, drops "www.", strips known tracking params (sorted so
// param order doesn't cause a false negative) and any trailing slash.
// Returns null for a URL that can't be parsed at all.
function normalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "");

    const params = new URLSearchParams(parsed.search);
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) params.delete(key);
    }
    params.sort();
    const query = params.toString();

    return `${host}${path}${query ? `?${query}` : ""}`;
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
