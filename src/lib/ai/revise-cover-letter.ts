import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { logUsage } from "@/lib/ai/tailor-cv";

export type ReviseCoverLetterResult = { ok: true; body: string } | { ok: false; error: string };

export async function reviseCoverLetter(
  userId: string,
  currentBody: string,
  instruction: string
): Promise<ReviseCoverLetterResult> {
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const { text, usage } = await generateText({
      model,
      prompt:
        "Revise this cover letter draft according to the instruction below. Return only the " +
        "revised cover letter text — no preamble, no explanation, no markdown formatting.\n\n" +
        `Instruction: ${instruction}\n\nCurrent draft:\n${currentBody}`,
      abortSignal: AbortSignal.timeout(30_000),
    });

    await logUsage(userId, "tailor_cover_letter", resolved.provider, usage.totalTokens ?? 0);
    return { ok: true, body: text };
  } catch (error) {
    console.error("[reviseCoverLetter]", error);
    return { ok: false, error: "Couldn't revise the draft — try again in a moment" };
  }
}
