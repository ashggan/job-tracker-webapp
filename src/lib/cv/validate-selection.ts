import { cvVariantSelectionSchema, type CvBaseContent, type CvVariantSelection } from "@/lib/cv/schema";
import { assembleCV } from "@/lib/cv/assemble-cv";

// Keeps a tailored CV's length sane and in the same ballpark run to run --
// assembleCV has no opinion on bullet count, only on whether the IDs it's
// given actually exist, so that business rule lives here instead.
export const MIN_BULLETS_PER_ROLE = 2;
export const MAX_BULLETS_PER_ROLE = 5;

export type ValidateSelectionResult =
  | { ok: true; data: CvVariantSelection }
  | { ok: false; error: string };

// Validates a raw AI tool-call result before it's trusted enough to store
// as a CvVariant or render. Three layers, cheapest first: the selection's
// shape (right fields, right types), the bullet-count business rule, then
// referential integrity against the real base -- reusing assembleCV for
// that last check rather than re-implementing its ID lookups, so the two
// can't drift apart on what counts as a valid reference. Returns an
// ok/error result (never throws) so a caller can retry the AI call with
// the error as feedback, the same pattern tailorCv/scoreFit use today.
export function validateSelection(raw: unknown, base: CvBaseContent): ValidateSelectionResult {
  const parsed = cvVariantSelectionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: `Selection didn't match the expected shape: ${parsed.error.message}` };
  }

  for (const selection of parsed.data.roleSelections) {
    const count = selection.bulletIds.length;
    if (count < MIN_BULLETS_PER_ROLE || count > MAX_BULLETS_PER_ROLE) {
      return {
        ok: false,
        error:
          `Role "${selection.roleId}" selected ${count} bullets, expected ` +
          `${MIN_BULLETS_PER_ROLE}-${MAX_BULLETS_PER_ROLE}`,
      };
    }
  }

  try {
    assembleCV(base, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Selection referenced an unknown ID" };
  }

  return { ok: true, data: parsed.data };
}
