const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
];

export type ExtractedJobMeta = {
  jobTitle?: string;
  company?: string;
  location?: string;
};

function isFetchableUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(parsed.hostname))) return false;
  return true;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function getMetaContent(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return undefined;
}

// Recursively walks parsed JSON-LD looking for a schema.org JobPosting node,
// handling the '@graph' wrapper and bare-array shapes sites commonly use.
function findJobPostingNode(data: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findJobPostingNode(item);
      if (found) return found;
    }
    return undefined;
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const type = obj["@type"];
    const typeMatches =
      type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
    if (typeMatches) return obj;
    if (obj["@graph"]) return findJobPostingNode(obj["@graph"]);
  }
  return undefined;
}

function jobLocationToString(jobLocation: unknown): string | undefined {
  const node = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
  if (!node || typeof node !== "object") return undefined;
  const address = (node as Record<string, unknown>).address;
  const addr = (typeof address === "object" && address ? address : node) as Record<string, unknown>;
  const locality = typeof addr.addressLocality === "string" ? addr.addressLocality : undefined;
  const region = typeof addr.addressRegion === "string" ? addr.addressRegion : undefined;
  const country = typeof addr.addressCountry === "string" ? addr.addressCountry : undefined;
  const parts = [locality, region].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return country;
}

function fromJsonLd(html: string): ExtractedJobMeta | undefined {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    const job = findJobPostingNode(parsed);
    if (!job) continue;

    const title = typeof job.title === "string" ? decodeEntities(job.title) : undefined;
    const org = job.hiringOrganization;
    const company =
      typeof org === "string"
        ? decodeEntities(org)
        : typeof org === "object" && org && typeof (org as Record<string, unknown>).name === "string"
          ? decodeEntities((org as Record<string, unknown>).name as string)
          : undefined;

    const isRemote =
      job.jobLocationType === "TELECOMMUTE" ||
      (Array.isArray(job.jobLocationType) && job.jobLocationType.includes("TELECOMMUTE"));
    const location = isRemote ? "Remote" : jobLocationToString(job.jobLocation);

    if (title || company || location) {
      return { jobTitle: title, company, location };
    }
  }
  return undefined;
}

function fromOpenGraph(html: string): ExtractedJobMeta | undefined {
  const ogTitle = getMetaContent(html, "og:title");
  const siteName = getMetaContent(html, "og:site_name");
  if (!ogTitle) return undefined;

  if (siteName && ogTitle.toLowerCase() !== siteName.toLowerCase()) {
    return { jobTitle: ogTitle, company: siteName };
  }

  // Titles are often formatted "Job Title at Company", "Job Title - Company", or "Job Title | Company".
  const separators = [" at ", " - ", " — ", " | "];
  for (const sep of separators) {
    const idx = ogTitle.indexOf(sep);
    if (idx > 0) {
      const jobTitle = ogTitle.slice(0, idx).trim();
      const company = ogTitle.slice(idx + sep.length).trim();
      if (jobTitle && company) return { jobTitle, company };
    }
  }

  return { jobTitle: ogTitle };
}

/**
 * Best-effort extraction only — never throws. A page that can't be fetched or
 * parsed just yields an empty result, so the caller falls back to manual entry.
 */
export async function extractJobPostingMeta(url: string): Promise<ExtractedJobMeta> {
  if (!isFetchableUrl(url)) return {};

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JOTAJobTracker/1.0; +https://github.com/ashggan/job-tracker-webapp)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return {};

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > 5_000_000) return {};

    const html = await response.text();
    return fromJsonLd(html) ?? fromOpenGraph(html) ?? {};
  } catch {
    return {};
  }
}
