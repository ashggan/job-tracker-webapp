import { generateObject } from "ai";
import { z } from "zod";
import type { AIAction, LlmProvider } from "@prisma/client";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { prisma } from "@/lib/prisma";
import type { ScoreFitInput } from "@/lib/ai/score-fit";

// Rough $/1M-token blended estimate (input+output average) per provider — just
// for the usage-accounting panel, not billing-accurate.
const ROUGH_COST_PER_1M_TOKENS: Record<string, number> = {
  anthropic: 8,
  openai: 5,
  google: 1,
};

// Exported so consumers of stored contentJson (e.g. docx-export.ts) can
// validate it at the same shape these functions produce.
export const tailoredCvSchema = z.object({
  summary: z.string(), // 2-3 sentence professional summary, tailored to this posting
  experienceBullets: z.array(z.string()), // rewritten/prioritized to foreground fit
  skills: z.array(z.string()),
});

export type TailoredCv = z.infer<typeof tailoredCvSchema>;
export type TailorCvResult = { ok: true; data: TailoredCv } | { ok: false; error: string };

export const coverLetterSchema = z.object({
  body: z.string(), // full cover letter text, 3-4 short paragraphs
});

export type TailoredCoverLetter = z.infer<typeof coverLetterSchema>;
export type TailorCoverLetterResult =
  | { ok: true; data: TailoredCoverLetter }
  | { ok: false; error: string };

async function loadCandidateContext(userId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const hasResume = profile?.resumeStructured != null;
  const hasPreferences = !!profile?.preferencesText?.trim();
  if (!hasResume && !hasPreferences) return null;

  return [
    hasResume ? `Candidate resume (structured):\n${JSON.stringify(profile!.resumeStructured)}` : null,
    hasPreferences ? `Candidate preferences/notes:\n${profile!.preferencesText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function jobContext(posting: ScoreFitInput): string {
  return [
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
}

async function logUsage(
  userId: string,
  action: AIAction,
  provider: LlmProvider,
  tokensUsed: number
): Promise<void> {
  await prisma.aIUsageLog.create({
    data: {
      userId,
      action,
      provider,
      tokensUsed,
      costEstimate: (tokensUsed / 1_000_000) * (ROUGH_COST_PER_1M_TOKENS[provider] ?? 5),
    },
  });
}

export async function tailorCv(userId: string, posting: ScoreFitInput): Promise<TailorCvResult> {
  const resolved = await resolveActiveKey(userId);
  if (!resolved) {
    return { ok: false, error: "Add an API key in Settings before using this feature" };
  }

  const candidateContext = await loadCandidateContext(userId);
  if (!candidateContext) {
    return {
      ok: false,
      error: "Complete your profile (resume or preferences) before tailoring your CV",
    };
  }

  try {
    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { object, usage } = await generateObject({
      model,
      schema: tailoredCvSchema,
      prompt:
        "Tailor this candidate's CV content for this specific job posting. Write a short " +
        "professional summary (2-3 sentences) that speaks directly to the role, reorder and " +
        "rewrite experience bullets to foreground what's most relevant to the posting's " +
        "requirements, and list the skills most relevant to this posting. Don't invent " +
        `experience the candidate doesn't have.\n\n${jobContext(posting)}\n\n${candidateContext}`,
      abortSignal: AbortSignal.timeout(30_000),
    });

    await logUsage(userId, "tailor_cv", resolved.provider, usage.totalTokens ?? 0);
    return { ok: true, data: object };
  } catch (error) {
    console.error("[tailorCv]", error);
    return {
      ok: false,
      error: "Couldn't tailor your CV for this posting — try again in a moment",
    };
  }
}

export async function tailorCoverLetter(
  userId: string,
  posting: ScoreFitInput
): Promise<TailorCoverLetterResult> {
  const resolved = await resolveActiveKey(userId);
  if (!resolved) {
    return { ok: false, error: "Add an API key in Settings before using this feature" };
  }

  const candidateContext = await loadCandidateContext(userId);
  if (!candidateContext) {
    return {
      ok: false,
      error: "Complete your profile (resume or preferences) before generating a cover letter",
    };
  }

  try {
    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { object, usage } = await generateObject({
      model,
      schema: coverLetterSchema,
      prompt:
        "Write a concise, specific cover letter (3-4 short paragraphs) for this candidate " +
        "applying to this job posting. Reference concrete requirements from the posting and " +
        "concrete experience from the candidate's background — avoid generic filler. Don't " +
        `invent experience the candidate doesn't have.\n\n${jobContext(posting)}\n\n${candidateContext}`,
      abortSignal: AbortSignal.timeout(30_000),
    });

    await logUsage(userId, "tailor_cover_letter", resolved.provider, usage.totalTokens ?? 0);
    return { ok: true, data: object };
  } catch (error) {
    console.error("[tailorCoverLetter]", error);
    return {
      ok: false,
      error: "Couldn't generate a cover letter for this posting — try again in a moment",
    };
  }
}
