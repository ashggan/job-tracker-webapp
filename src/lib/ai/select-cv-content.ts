import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { jobContext, logUsage } from "@/lib/ai/tailor-cv";
import { cvVariantSelectionSchema, type CvBaseContent, type CvVariantSelection } from "@/lib/cv/schema";
import { validateSelection } from "@/lib/cv/validate-selection";
import type { ScoreFitInput } from "@/lib/ai/score-fit";

// The AI never writes or rewords CV text -- it only selects IDs out of the
// candidate's real CvBase content. `reasoning` rides alongside the stored
// selection shape (cvVariantSelectionSchema) but isn't part of it; it's
// pulled off this wider schema and returned separately.
const selectionOutputSchema = cvVariantSelectionSchema.extend({ reasoning: z.string() });

export type SelectCvContentResult =
  | { ok: true; data: CvVariantSelection; reasoning: string }
  | { ok: false; error: string };

// One retry, with the previous validation error folded into the prompt --
// enough to recover from an off-by-one bad ID without looping indefinitely
// on a provider that keeps getting it wrong.
const MAX_ATTEMPTS = 2;

// Renders a CvBaseContent into the ID-labeled listing the model selects
// from. Exported for testing -- the actual selection call isn't unit-tested
// (no generateObject mock in this codebase's conventions), but this pure
// formatting step is.
export function describeBaseForPrompt(base: CvBaseContent): string {
  const roles = base.roles
    .map((role) => {
      const bullets = role.bullets.map((b) => `    - [${b.bulletId}] ${b.text}`).join("\n");
      return `  - roleId: ${role.roleId} (${role.title}, ${role.company}, ${role.dates})\n${bullets}`;
    })
    .join("\n");

  const skills = base.skills
    .map((group) => {
      const items = group.skills.map((s) => `[${s.skillId}] ${s.text}`).join(", ");
      return `  - ${group.category}: ${items}`;
    })
    .join("\n");

  const summaryVariants = base.summaryVariants.map((v) => `  - [${v.variantId}] ${v.text}`).join("\n");

  return [
    "Roles (every roleId below must appear exactly once in roleSelections):",
    roles,
    "\nSkills (skillId -- pick only what's relevant to this posting):",
    skills,
    "\nSummary variants (pick exactly one by variantId):",
    summaryVariants,
  ].join("\n");
}

export async function selectCvContent(
  userId: string,
  posting: ScoreFitInput,
  base: CvBaseContent
): Promise<SelectCvContentResult> {
  try {
    const resolved = await resolveActiveKey(userId);
    if (!resolved) {
      return { ok: false, error: "Add an API key in Settings before using this feature" };
    }

    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const basePrompt =
      "Tailor this candidate's CV for this specific job posting by SELECTING from their real " +
      "CV content below -- you never write, reword, or paraphrase any CV text, only choose IDs. " +
      "For the summary, pick exactly one summaryVariantId. For every role listed, include it in " +
      "roleSelections and pick between 2 and 5 of its bulletIds, ordered with the most relevant " +
      "to this posting first -- every role must appear, you cannot omit one or invent a bullet. " +
      "For skills, pick the skillIds most relevant to this posting, ordered by relevance; leaving " +
      "out skills that don't matter for this posting is fine. Give a short reasoning for your " +
      `choices.\n\n${jobContext(posting)}\n\nCandidate's real CV content, by ID:\n${describeBaseForPrompt(base)}`;

    let lastError = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const prompt =
        attempt === 1
          ? basePrompt
          : `${basePrompt}\n\nYour previous attempt was rejected: ${lastError}\nTry again, using only the IDs listed above.`;

      const { object, usage } = await generateObject({
        model,
        schema: selectionOutputSchema,
        prompt,
        abortSignal: AbortSignal.timeout(30_000),
      });

      await logUsage(userId, "tailor_cv", resolved.provider, usage.totalTokens ?? 0);

      const validated = validateSelection(object, base);
      if (validated.ok) {
        return { ok: true, data: validated.data, reasoning: object.reasoning };
      }
      lastError = validated.error;
    }

    console.error("[selectCvContent] validation failed after retry:", lastError);
    return { ok: false, error: "Couldn't tailor your CV for this posting — try again in a moment" };
  } catch (error) {
    console.error("[selectCvContent]", error);
    return { ok: false, error: "Couldn't tailor your CV for this posting — try again in a moment" };
  }
}
