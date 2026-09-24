import { generateObject } from "ai";
import { z } from "zod";
import type { AIAction, LlmProvider } from "@prisma/client";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { loadCandidateContext } from "@/lib/ai/candidate-context";
import { wrapUntrustedBlock } from "@/lib/ai/untrusted-content";
import { resumeSectionsSchema } from "@/lib/ai/extract-resume-sections";
import { prisma } from "@/lib/prisma";
import type { ScoreFitInput } from "@/lib/ai/score-fit";

// Rough $/1M-token blended estimate (input+output average) per provider — just
// for the usage-accounting panel, not billing-accurate.
const ROUGH_COST_PER_1M_TOKENS: Record<string, number> = {
  anthropic: 8,
  openai: 5,
  google: 1,
};

// A full structured resume: header/languages/education/additionalSections
// are copied through verbatim from the real resume (never AI-generated, so
// they can never be fabricated); summary/experience/skills are what the AI
// is allowed to tailor. Exported so consumers of stored contentJson (e.g.
// docx-export.ts) can validate it at the same shape this file produces.
export const tailoredCvSchema = z.object({
  header: z.object({
    name: z.string().nullable(),
    title: z.string().nullable(),
    contacts: z.array(z.string()),
  }),
  summary: z.string(),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      dates: z.string(),
      projects: z.array(
        z.object({
          name: z.string().nullable(),
          bullets: z.array(z.string()),
        })
      ),
    })
  ),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  languages: z.array(z.string()),
  education: z.array(
    z.object({ school: z.string(), degree: z.string().nullable(), dates: z.string().nullable() })
  ),
  additionalSections: z.array(z.object({ heading: z.string(), items: z.array(z.string()) })),
});

export type TailoredCv = z.infer<typeof tailoredCvSchema>;

// The resume's own summary/experience/skills, before tailoring -- returned
// alongside the tailored result so the UI can highlight what actually
// changed, without a second DB round-trip.
export type OriginalCvContent = Pick<z.infer<typeof resumeSectionsSchema>, "summary" | "experience" | "skills">;

export type TailorCvResult =
  | { ok: true; data: TailoredCv; original: OriginalCvContent }
  | { ok: false; error: string };

// Only the fields the AI is allowed to generate/rewrite -- everything else
// in TailoredCv is merged in afterward from the resume's own sections.
const tailoredContentSchema = tailoredCvSchema.pick({ summary: true, experience: true, skills: true });

export const coverLetterSchema = z.object({
  body: z.string(), // full cover letter text, 3-4 short paragraphs
});

export type TailoredCoverLetter = z.infer<typeof coverLetterSchema>;
export type TailorCoverLetterResult =
  | { ok: true; data: TailoredCoverLetter }
  | { ok: false; error: string };

function jobContext(posting: ScoreFitInput): string {
  const raw = [
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
  return wrapUntrustedBlock("job_posting", raw);
}

export async function logUsage(
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
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const resume = await prisma.userResume.findUnique({ where: { userId } });
    const parsedSections = resumeSectionsSchema.safeParse(resume?.basicInfo);
    if (!parsedSections.success) {
      return { ok: false, error: "Upload a resume in Profile before tailoring your CV" };
    }
    const sections = parsedSections.data;

    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { object, usage } = await generateObject({
      model,
      schema: tailoredContentSchema,
      prompt:
        "Tailor this candidate's resume content for this specific job posting. Rewrite the " +
        "summary (2-3 sentences) to speak directly to the role. For each job, reorder and " +
        "rewrite its bullets (within each project) to foreground what's most relevant to the " +
        "posting — but keep every company, title, dates, and project name exactly as given, " +
        "never invent or change them. Reorder and select from the candidate's real skills to " +
        "foreground what's relevant — keep the same category names, never invent a skill they " +
        "don't have. Don't invent experience the candidate doesn't have. Return every job from " +
        "the candidate's real experience, not just the most relevant ones.\n\n" +
        `${jobContext(posting)}\n\nCandidate's real resume data:\n${JSON.stringify({
          experience: sections.experience,
          skills: sections.skills,
        })}`,
      abortSignal: AbortSignal.timeout(30_000),
    });

    await logUsage(userId, "tailor_cv", resolved.provider, usage.totalTokens ?? 0);

    return {
      ok: true,
      data: {
        header: sections.header,
        summary: object.summary,
        experience: object.experience,
        skills: object.skills,
        languages: sections.languages,
        education: sections.education,
        additionalSections: sections.additionalSections,
      },
      original: {
        summary: sections.summary,
        experience: sections.experience,
        skills: sections.skills,
      },
    };
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
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const candidateContext = await loadCandidateContext(userId);
    if (!candidateContext) {
      return {
        ok: false,
        error: "Upload a resume or add preferences in Profile before generating a cover letter",
      };
    }

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
