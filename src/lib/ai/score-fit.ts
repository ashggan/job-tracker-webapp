import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { loadCandidateContext } from "@/lib/ai/candidate-context";
import { wrapUntrustedBlock } from "@/lib/ai/untrusted-content";
import { prisma } from "@/lib/prisma";

// Rough $/1M-token blended estimate (input+output average) per provider — just
// for the usage-accounting panel, not billing-accurate.
const ROUGH_COST_PER_1M_TOKENS: Record<string, number> = {
  anthropic: 8,
  openai: 5,
  google: 1,
};

const fitScoreSchema = z.object({
  fitScore: z.number().int().min(0).max(10),
  fitLabel: z.enum(["stretch", "fair", "good", "strong"]),
  fitStrengths: z.array(z.string()), // specific, each tied to a requirement/nice-to-have item
  fitGaps: z.array(z.string()),
  fitRecommendation: z.string(), // short plain-language line, e.g. "7/10 — worth tailoring"
});

export type FitScore = z.infer<typeof fitScoreSchema>;

export type ScoreFitInput = {
  jobTitle: string;
  company: string;
  descriptionText: string;
  requirements: string[];
  niceToHaves: string[];
};

export type ScoreFitResult =
  | { ok: true; data: FitScore }
  | { ok: false; error: string };

export async function scoreFit(
  userId: string,
  posting: ScoreFitInput
): Promise<ScoreFitResult> {
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const candidateContext = await loadCandidateContext(userId);
    if (!candidateContext) {
      return {
        ok: false,
        error: "Upload a resume or add preferences in Profile before scoring fit",
      };
    }

    const jobContext = [
      `Job title: ${posting.jobTitle}`,
      `Company: ${posting.company}`,
      `Description: ${posting.descriptionText}`,
      `Requirements:\n${posting.requirements.map((r) => `- ${r}`).join("\n")}`,
      posting.niceToHaves.length
        ? `Nice to have:\n${posting.niceToHaves.map((n) => `- ${n}`).join("\n")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { object, usage } = await generateObject({
      model,
      schema: fitScoreSchema,
      prompt:
        "Score how well this candidate fits this job posting on a 0-10 scale, using these " +
        "fixed bands so scores are comparable across postings and providers — anchor to the " +
        "band definition rather than a free-floating feeling:\n" +
        "0-2 (stretch): missing most required qualifications; the role calls for a " +
        "fundamentally different background.\n" +
        "3-5 (fair): meets roughly half the requirements; a plausible but not strong candidate.\n" +
        "6-8 (good): meets nearly all requirements with at most minor gaps.\n" +
        "9-10 (strong): meets every requirement and several nice-to-haves; an excellent match.\n" +
        "Set fitLabel to match the band the score falls in. List fitStrengths and fitGaps as " +
        "specific points, each tied to a concrete requirement or nice-to-have from the posting " +
        "— not generic observations. fitRecommendation should be one short plain-language line, " +
        `e.g. "7/10 — worth tailoring".\n\n` +
        `${wrapUntrustedBlock("job_posting", jobContext)}\n\n${candidateContext}`,
      abortSignal: AbortSignal.timeout(30_000),
    });

    const tokensUsed = usage.totalTokens ?? 0;
    await prisma.aIUsageLog.create({
      data: {
        userId,
        action: "score",
        provider: resolved.provider,
        tokensUsed,
        costEstimate: (tokensUsed / 1_000_000) * (ROUGH_COST_PER_1M_TOKENS[resolved.provider] ?? 5),
      },
    });

    return { ok: true, data: object };
  } catch (error) {
    console.error("[scoreFit]", error);
    return {
      ok: false,
      error: "Couldn't score fit for this posting — try again in a moment",
    };
  }
}
