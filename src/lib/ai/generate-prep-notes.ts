import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { loadCandidateContext } from "@/lib/ai/candidate-context";
import { wrapUntrustedBlock } from "@/lib/ai/untrusted-content";
import { logUsage } from "@/lib/ai/tailor-cv";
import type { ScoreFitInput, FitScore } from "@/lib/ai/score-fit";

export type GeneratePrepNotesResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string };

export async function generatePrepNotes(
  userId: string,
  posting: ScoreFitInput,
  fit: FitScore | null
): Promise<GeneratePrepNotesResult> {
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const candidateContext = await loadCandidateContext(userId);

    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { text, usage } = await generateText({
      model,
      prompt:
        "Write interview prep notes as Markdown for this candidate applying to this job " +
        "posting. Include: likely topics/questions given the role and requirements, how to " +
        "address any gaps between the candidate's background and the posting, and 2-3 " +
        "concrete talking points from the candidate's real experience worth highlighting. " +
        "Be specific to this posting and candidate — no generic interview advice. Use " +
        "Markdown headings and bullet lists.\n\n" +
        wrapUntrustedBlock(
          "job_posting",
          `Job title: ${posting.jobTitle}\n` +
            `Company: ${posting.company}\n` +
            `Description: ${posting.descriptionText}\n` +
            `Requirements:\n${posting.requirements.map((r) => `- ${r}`).join("\n")}`
        ) +
        "\n\n" +
        (fit
          ? `Fit assessment — score ${fit.fitScore}/10, strengths: ${fit.fitStrengths.join("; ")}, ` +
            `gaps: ${fit.fitGaps.join("; ")}, recommendation: ${fit.fitRecommendation}\n\n`
          : "") +
        (candidateContext ?? ""),
      abortSignal: AbortSignal.timeout(30_000),
    });

    await logUsage(userId, "generate_prep_notes", resolved.provider, usage.totalTokens ?? 0);
    return { ok: true, markdown: text };
  } catch (error) {
    console.error("[generatePrepNotes]", error);
    return { ok: false, error: "Couldn't generate interview prep notes — try again in a moment" };
  }
}
