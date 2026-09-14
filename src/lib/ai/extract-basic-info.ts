import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { prisma } from "@/lib/prisma";

// Rough $/1M-token blended estimate (input+output average) per provider --
// same convention as the other AI call sites: for the usage-accounting
// panel, not billing-accurate.
const ROUGH_COST_PER_1M_TOKENS: Record<string, number> = {
  anthropic: 8,
  openai: 5,
  google: 1,
};

const basicInfoSchema = z.object({
  name: z.string().nullable(),
  title: z.string().nullable(),
  email: z.string().nullable(),
  summary: z.string().nullable(),
});

export type ResumeBasicInfo = z.infer<typeof basicInfoSchema>;

/**
 * Best-effort extraction of a few display-friendly fields from resume text,
 * purely for the Profile page's preview -- never a scoring/tailoring input
 * (those read extractedText directly) and never persisted as anything but a
 * derived cache that gets overwritten on the next upload.
 *
 * Never throws: no API key configured, a provider error, or a timeout all
 * just return null. This must never block or fail an upload -- the resume
 * is already saved by the time this runs.
 */
export async function extractBasicInfo(
  userId: string,
  resumeText: string
): Promise<ResumeBasicInfo | null> {
  let resolved;
  try {
    resolved = await resolveActiveKey(userId);
    if (!resolved) return null;
  } catch (error) {
    console.error("[extractBasicInfo] key resolution failed", error);
    return null;
  }

  let object;
  let tokensUsed = 0;
  try {
    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const result = await generateObject({
      model,
      schema: basicInfoSchema,
      prompt:
        "Extract the candidate's name, most recent/current job title, email address, and a " +
        "one-to-two sentence summary of their background from this resume text. Use null for " +
        `any field you can't confidently find -- don't guess.\n\n${resumeText}`,
      abortSignal: AbortSignal.timeout(30_000),
    });
    object = result.object;
    tokensUsed = result.usage.totalTokens ?? 0;
  } catch (error) {
    console.error("[extractBasicInfo] model call failed", error);
    return null;
  }

  // A real result is already in hand at this point -- a failure logging it
  // must not throw the result away. (Usage-accounting is a nice-to-have on
  // top of a successful extraction, not a precondition for returning one.)
  try {
    await prisma.aIUsageLog.create({
      data: {
        userId,
        action: "extract_resume",
        provider: resolved.provider,
        keySource: "own_key",
        costEstimate: (tokensUsed / 1_000_000) * (ROUGH_COST_PER_1M_TOKENS[resolved.provider] ?? 5),
      },
    });
  } catch (error) {
    console.error("[extractBasicInfo] usage log write failed", error);
  }

  return object;
}
