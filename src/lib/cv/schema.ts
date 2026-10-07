import { z } from "zod";

// The shapes stored in CvBase's Json columns and CvVariant's selection
// columns (see prisma/schema.prisma) -- kept independent of the Prisma
// Client types (which see Json columns as `unknown`) so assembleCV and its
// callers get real structural typing and runtime validation, the same way
// tailoredCvSchema/resumeSectionsSchema validate their own Json columns.

export const cvBulletSchema = z.object({
  bulletId: z.string(),
  text: z.string(),
});

export const cvRoleSchema = z.object({
  roleId: z.string(),
  company: z.string(),
  title: z.string(),
  dates: z.string(),
  bullets: z.array(cvBulletSchema),
});

export const cvSkillSchema = z.object({
  skillId: z.string(),
  text: z.string(),
});

export const cvSkillGroupSchema = z.object({
  category: z.string(),
  skills: z.array(cvSkillSchema),
});

export const cvSummaryVariantSchema = z.object({
  variantId: z.string(),
  text: z.string(),
});

export const cvEducationEntrySchema = z.object({
  school: z.string(),
  degree: z.string().nullable(),
  dates: z.string().nullable(),
});

export const cvAdditionalSectionSchema = z.object({
  heading: z.string(),
  items: z.array(z.string()),
});

// CvBase: the fixed facts (role order, bullet/skill wording) plus the
// pre-written summary options the AI picks from -- see roles/skills/
// summaryVariants comments in the schema for what's fixed vs. selectable.
export const cvBaseContentSchema = z.object({
  header: z.object({
    name: z.string().nullable(),
    title: z.string().nullable(),
    contacts: z.array(z.string()),
  }),
  roles: z.array(cvRoleSchema),
  skills: z.array(cvSkillGroupSchema),
  languages: z.array(z.string()),
  education: z.array(cvEducationEntrySchema),
  additionalSections: z.array(cvAdditionalSectionSchema),
  summaryVariants: z.array(cvSummaryVariantSchema),
});

export type CvBaseContent = z.infer<typeof cvBaseContentSchema>;

// CvVariant: what a given application's tailoring selected -- IDs only,
// never free text, matched against a CvBaseContent by assembleCV.
export const cvVariantSelectionSchema = z.object({
  summaryVariantId: z.string(),
  roleSelections: z.array(
    z.object({
      roleId: z.string(),
      bulletIds: z.array(z.string()),
    })
  ),
  skillIds: z.array(z.string()),
});

export type CvVariantSelection = z.infer<typeof cvVariantSelectionSchema>;
