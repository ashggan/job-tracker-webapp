import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { prisma } from "@/lib/prisma";
import { isFetchableUrl } from "@/lib/job-extraction";

// Rough $/1M-token blended estimate (input+output average) per provider — just
// for the usage-accounting panel, not billing-accurate.
const ROUGH_COST_PER_1M_TOKENS: Record<string, number> = {
  anthropic: 8,
  openai: 5,
  google: 1,
};

const extractedPostingSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  niceToHaves: z.array(z.string()),
  deadline: z.string().nullable(), // ISO date (YYYY-MM-DD), or null if not stated — never inferred
  wantsCoverLetter: z.boolean(),
});

export type ExtractedPosting = z.infer<typeof extractedPostingSchema>;

export type ExtractPostingResult =
  | { ok: true; data: ExtractedPosting }
  | { ok: false; error: string };

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Best-effort only — never throws. A page that can't be fetched (JS-rendered,
// paywalled, blocked) returns null, so the caller falls back to a paste-text
// step rather than failing the whole wizard.
export async function fetchPostingText(url: string): Promise<string | null> {
  if (!isFetchableUrl(url)) return null;

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
    if (!response.ok) return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > 5_000_000) return null;

    const html = await response.text();
    const text = stripHtmlToText(html);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export async function extractPostingDetails(
  userId: string,
  sourceText: string
): Promise<ExtractPostingResult> {
  const resolved = await resolveActiveKey(userId);
  if (!resolved) {
    return { ok: false, error: "Add an API key in Settings before using this feature" };
  }

  try {
    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { object, usage } = await generateObject({
      model,
      schema: extractedPostingSchema,
      prompt:
        "Extract structured fields from this job posting. If the posting states an " +
        "application deadline, return it as an ISO date (YYYY-MM-DD) — if it doesn't state " +
        "one, return null; never guess or infer one. Set wantsCoverLetter to true only if " +
        "the posting explicitly asks for or strongly implies a cover letter is wanted.\n\n" +
        sourceText.slice(0, 15000),
      abortSignal: AbortSignal.timeout(30_000),
    });

    const tokensUsed = usage.totalTokens ?? 0;
    await prisma.aIUsageLog.create({
      data: {
        userId,
        action: "extract_listing",
        provider: resolved.provider,
        tokensUsed,
        costEstimate: (tokensUsed / 1_000_000) * (ROUGH_COST_PER_1M_TOKENS[resolved.provider] ?? 5),
      },
    });

    return { ok: true, data: object };
  } catch (error) {
    console.error("[extractPostingDetails]", error);
    return {
      ok: false,
      error: "Couldn't extract details from that posting — try pasting the description instead",
    };
  }
}
