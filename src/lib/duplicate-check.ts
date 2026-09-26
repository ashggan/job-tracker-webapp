import { prisma } from "@/lib/prisma";
import type { Stage } from "@prisma/client";

export type DuplicateMatch = {
  id: string;
  company: string;
  jobTitle: string;
  stage: Stage;
  createdAt: Date;
};

export type DuplicateCandidate = { postingUrl?: string | null; company: string; jobTitle: string };

type ExistingApplication = DuplicateMatch & { postingUrl: string | null };

const EXISTING_SELECT = {
  id: true,
  company: true,
  jobTitle: true,
  stage: true,
  createdAt: true,
  postingUrl: true,
} as const;

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

function toDuplicateMatch(row: ExistingApplication): DuplicateMatch {
  return { id: row.id, company: row.company, jobTitle: row.jobTitle, stage: row.stage, createdAt: row.createdAt };
}

// URL match takes priority (a repost under a slightly different title still
// shouldn't slip through); falls back to a case-insensitive, trimmed
// company+title match only when there's no URL match at all.
function matchCandidate(existing: ExistingApplication[], candidate: DuplicateCandidate): DuplicateMatch[] {
  const normalizedTarget = candidate.postingUrl ? normalizeUrl(candidate.postingUrl) : null;
  if (normalizedTarget) {
    const urlMatches = existing.filter(
      (row) => row.postingUrl && normalizeUrl(row.postingUrl) === normalizedTarget
    );
    if (urlMatches.length > 0) return urlMatches.map(toDuplicateMatch);
  }

  const company = candidate.company.trim().toLowerCase();
  const jobTitle = candidate.jobTitle.trim().toLowerCase();
  return existing
    .filter((row) => row.company.trim().toLowerCase() === company && row.jobTitle.trim().toLowerCase() === jobTitle)
    .map(toDuplicateMatch);
}

// Fetches the user's applications once regardless of candidate count, so an
// N-row bulk import doesn't cost N database round-trips -- every candidate
// is matched against the same in-memory snapshot.
export async function findDuplicateApplicationsForBatch(
  userId: string,
  candidates: DuplicateCandidate[]
): Promise<DuplicateMatch[][]> {
  const existing = await prisma.application.findMany({ where: { userId }, select: EXISTING_SELECT });
  return candidates.map((candidate) => matchCandidate(existing, candidate));
}

export async function findDuplicateApplications(
  userId: string,
  candidate: DuplicateCandidate
): Promise<DuplicateMatch[]> {
  const [matches] = await findDuplicateApplicationsForBatch(userId, [candidate]);
  return matches;
}

// findDuplicateApplicationsForBatch only checks each candidate against
// applications already in the DB -- two identical rows within the same
// import batch never get compared to each other. This flags a candidate as
// a repeat of an earlier row in the same batch (by index), using the same
// URL-first-then-company+title priority as matchCandidate.
export function findWithinBatchDuplicates(candidates: DuplicateCandidate[]): (number | null)[] {
  const firstSeenByUrl = new Map<string, number>();
  const firstSeenByTitle = new Map<string, number>();

  return candidates.map((candidate, i) => {
    const normalizedUrl = candidate.postingUrl ? normalizeUrl(candidate.postingUrl) : null;
    const titleKey = `${candidate.company.trim().toLowerCase()}|${candidate.jobTitle.trim().toLowerCase()}`;

    const priorByUrl = normalizedUrl ? firstSeenByUrl.get(normalizedUrl) : undefined;
    const priorByTitle = firstSeenByTitle.get(titleKey);
    const priorIndex = priorByUrl ?? priorByTitle ?? null;

    if (priorIndex == null) {
      if (normalizedUrl) firstSeenByUrl.set(normalizedUrl, i);
      firstSeenByTitle.set(titleKey, i);
    }

    return priorIndex;
  });
}
