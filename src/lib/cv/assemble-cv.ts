import type {
  CvBaseContent,
  CvVariantSelection,
  cvAdditionalSectionSchema,
  cvEducationEntrySchema,
} from "@/lib/cv/schema";
import type { z } from "zod";

export type AssembledCv = {
  header: CvBaseContent["header"];
  summary: string;
  roles: Array<{ company: string; title: string; dates: string; bullets: string[] }>;
  skills: Array<{ category: string; items: string[] }>;
  languages: string[];
  education: z.infer<typeof cvEducationEntrySchema>[];
  additionalSections: z.infer<typeof cvAdditionalSectionSchema>[];
};

// Pure: same (base, variant) always produces the same output, and every
// piece of text in that output is copied verbatim from base -- this
// function never generates or alters wording, it only looks up and orders.
// Throws on any ID the variant references that doesn't exist in base
// (bullet, skill, summary variant) or any base role the variant doesn't
// cover, rather than silently dropping content -- a selection naming a
// dead ID is a bug upstream (the AI call or hand-authored data), not
// something this function should paper over.
export function assembleCV(base: CvBaseContent, variant: CvVariantSelection): AssembledCv {
  const summaryVariant = base.summaryVariants.find((v) => v.variantId === variant.summaryVariantId);
  if (!summaryVariant) {
    throw new Error(`assembleCV: unknown summaryVariantId "${variant.summaryVariantId}"`);
  }

  const selectionByRoleId = new Map(variant.roleSelections.map((sel) => [sel.roleId, sel]));
  // Role order is authoritative from base, not from the variant's selection
  // order -- the variant only chooses bullets within each role.
  const roles = base.roles.map((role) => {
    const selection = selectionByRoleId.get(role.roleId);
    if (!selection) {
      throw new Error(`assembleCV: missing bullet selection for roleId "${role.roleId}"`);
    }
    const bulletTextById = new Map(role.bullets.map((b) => [b.bulletId, b.text]));
    const bullets = selection.bulletIds.map((bulletId) => {
      const text = bulletTextById.get(bulletId);
      if (text === undefined) {
        throw new Error(`assembleCV: unknown bulletId "${bulletId}" for roleId "${role.roleId}"`);
      }
      return text;
    });
    return { company: role.company, title: role.title, dates: role.dates, bullets };
  });

  const skillById = new Map(
    base.skills.flatMap((group) => group.skills.map((skill) => [skill.skillId, { category: group.category, text: skill.text }] as const))
  );
  const itemsByCategory = new Map<string, string[]>();
  for (const skillId of variant.skillIds) {
    const entry = skillById.get(skillId);
    if (!entry) {
      throw new Error(`assembleCV: unknown skillId "${skillId}"`);
    }
    const items = itemsByCategory.get(entry.category) ?? [];
    items.push(entry.text);
    itemsByCategory.set(entry.category, items);
  }
  // Category order is authoritative from base, same reasoning as roles;
  // only item order within a category (and which items appear) is variant-driven.
  const skills = base.skills
    .map((group) => ({ category: group.category, items: itemsByCategory.get(group.category) ?? [] }))
    .filter((group) => group.items.length > 0);

  return {
    header: base.header,
    summary: summaryVariant.text,
    roles,
    skills,
    languages: base.languages,
    education: base.education,
    additionalSections: base.additionalSections,
  };
}
