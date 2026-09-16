import { z } from "zod";

// TailoredDocument.contentJson for the prep_notes/perks kinds is stored as
// Prisma Json (unknown at runtime) -- validate it before trusting the shape,
// same rationale as docx-export.ts's renderTailoredDocumentDocx.
const markdownDocSchema = z.object({ markdown: z.string() });

export function renderTailoredDocumentMarkdown(contentJson: unknown): string {
  return markdownDocSchema.parse(contentJson).markdown;
}
