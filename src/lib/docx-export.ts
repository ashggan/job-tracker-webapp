import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import type { TailoredKind } from "@prisma/client";
import { tailoredCvSchema, coverLetterSchema } from "@/lib/ai/tailor-cv";

// TailoredDocument.contentJson is stored as Prisma Json (unknown at runtime) —
// validate it against the same schema the AI functions produce before
// rendering, rather than trusting the shape.
export function renderTailoredDocumentDocx(kind: TailoredKind, contentJson: unknown): Promise<Buffer> {
  if (kind === "cv") {
    const cv = tailoredCvSchema.parse(contentJson);
    return Packer.toBuffer(
      new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 }),
              new Paragraph({ children: [new TextRun(cv.summary)] }),
              new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_2 }),
              ...cv.experienceBullets.map(
                (bullet) => new Paragraph({ text: bullet, bullet: { level: 0 } })
              ),
              new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_2 }),
              new Paragraph({ children: [new TextRun(cv.skills.join(", "))] }),
            ],
          },
        ],
      })
    );
  }

  const letter = coverLetterSchema.parse(contentJson);
  return Packer.toBuffer(
    new Document({
      sections: [
        {
          children: letter.body
            .split(/\n+/)
            .filter((line) => line.trim().length > 0)
            .map((paragraph) => new Paragraph({ children: [new TextRun(paragraph.trim())] })),
        },
      ],
    })
  );
}
