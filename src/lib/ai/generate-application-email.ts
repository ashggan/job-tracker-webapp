import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { loadCandidateContext } from "@/lib/ai/candidate-context";
import { wrapUntrustedBlock } from "@/lib/ai/untrusted-content";
import { logUsage } from "@/lib/ai/tailor-cv";
import type { ScoreFitInput } from "@/lib/ai/score-fit";

export const applicationEmailSchema = z.object({
  subject: z.string(), // specific, names the role, e.g. "Application for Senior Engineer — Jane Doe"
  body: z.string(), // 3-5 short paragraphs, plain email body (no markdown, no subject line repeated)
});

export type ApplicationEmail = z.infer<typeof applicationEmailSchema>;

export type GenerateApplicationEmailResult =
  | { ok: true; data: ApplicationEmail }
  | { ok: false; error: string };

export async function generateApplicationEmail(
  userId: string,
  posting: ScoreFitInput
): Promise<GenerateApplicationEmailResult> {
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const candidateContext = await loadCandidateContext(userId);
    if (!candidateContext) {
      return {
        ok: false,
        error: "Upload a resume or add preferences in Profile before generating an application email",
      };
    }

    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { object, usage } = await generateObject({
      model,
      schema: applicationEmailSchema,
      prompt:
        "Write a short application email for this candidate to send when applying to this job " +
        "posting — not a full cover letter. Give it a specific subject line naming the role. " +
        "The body should be 3-5 short paragraphs: a brief intro stating the role being applied " +
        "for, 1-2 sentences on why the candidate is a strong fit (grounded in their real " +
        "background), a mention that the resume and cover letter are attached, and a brief " +
        "closing. Professional but conversational tone — this is an email, not a formal letter. " +
        "Don't invent experience the candidate doesn't have.\n\n" +
        wrapUntrustedBlock(
          "job_posting",
          `Job title: ${posting.jobTitle}\n` +
            `Company: ${posting.company}\n` +
            `Description: ${posting.descriptionText}\n` +
            `Requirements:\n${posting.requirements.map((r) => `- ${r}`).join("\n")}`
        ) +
        `\n\n${candidateContext}`,
      abortSignal: AbortSignal.timeout(30_000),
    });

    await logUsage(userId, "generate_application_email", resolved.provider, usage.totalTokens ?? 0);
    return { ok: true, data: object };
  } catch (error) {
    console.error("[generateApplicationEmail]", error);
    return {
      ok: false,
      error: "Couldn't generate an application email for this posting — try again in a moment",
    };
  }
}
