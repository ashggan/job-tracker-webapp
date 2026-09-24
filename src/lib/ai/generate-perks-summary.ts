import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { wrapUntrustedBlock } from "@/lib/ai/untrusted-content";
import { logUsage } from "@/lib/ai/tailor-cv";
import type { ScoreFitInput } from "@/lib/ai/score-fit";

export type GeneratePerksSummaryResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string };

export async function generatePerksSummary(
  userId: string,
  posting: ScoreFitInput
): Promise<GeneratePerksSummaryResult> {
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { text, usage } = await generateText({
      model,
      prompt:
        "Summarize the compensation, benefits, and perks stated in this job posting as " +
        "Markdown with short bullet lists (e.g. Salary, Benefits, Perks sections). Only " +
        "include what the posting actually states — never guess or infer a figure or perk " +
        "it doesn't mention. If the posting states none of this, say so plainly instead of " +
        "inventing anything.\n\n" +
        wrapUntrustedBlock(
          "job_posting",
          `Job title: ${posting.jobTitle}\n` +
            `Company: ${posting.company}\n` +
            `Description: ${posting.descriptionText}`
        ),
      abortSignal: AbortSignal.timeout(30_000),
    });

    await logUsage(userId, "generate_perks_summary", resolved.provider, usage.totalTokens ?? 0);
    return { ok: true, markdown: text };
  } catch (error) {
    console.error("[generatePerksSummary]", error);
    return { ok: false, error: "Couldn't summarize salary/perks for this posting — try again in a moment" };
  }
}
