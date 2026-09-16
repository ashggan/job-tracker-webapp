import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
  type ParagraphChild,
} from "docx";
import type { TailoredKind } from "@prisma/client";
import { tailoredCvSchema, coverLetterSchema, type TailoredCv } from "@/lib/ai/tailor-cv";

const EMAIL_PATTERN = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
// A bare domain/URL contact entry -- "ashgan.tech", "linkedin.com/in/x",
// "github.com/x", or a full "https://..." link -- vs. plain text like a
// location, which never has a dot-separated, space-free segment like this.
const URL_LIKE_PATTERN = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/;

// Standard Word hyperlink styling (blue + underline) -- docx doesn't apply
// this automatically for ExternalHyperlink, it only wires up the click target.
function hyperlinkRun(text: string): TextRun {
  return new TextRun({ text, color: "0563C1", underline: {} });
}

// Turns one header contact entry into a real clickable link when it's an
// email or a URL/domain; anything else (e.g. a location) stays plain text.
function contactRun(contact: string): ParagraphChild {
  const trimmed = contact.trim();
  if (EMAIL_PATTERN.test(trimmed)) {
    return new ExternalHyperlink({ link: `mailto:${trimmed}`, children: [hyperlinkRun(trimmed)] });
  }
  if (URL_LIKE_PATTERN.test(trimmed)) {
    const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return new ExternalHyperlink({ link: href, children: [hyperlinkRun(trimmed)] });
  }
  return new TextRun(trimmed);
}

function contactsParagraph(contacts: string[]): Paragraph {
  const children: ParagraphChild[] = [];
  contacts.forEach((contact, i) => {
    if (i > 0) children.push(new TextRun("  |  "));
    children.push(contactRun(contact));
  });
  return new Paragraph({ children });
}

function renderCv(cv: TailoredCv) {
  const children: Paragraph[] = [];

  if (cv.header.name) {
    children.push(new Paragraph({ children: [new TextRun({ text: cv.header.name, bold: true, size: 32 })] }));
  }
  if (cv.header.title) {
    children.push(new Paragraph({ children: [new TextRun({ text: cv.header.title, size: 24 })] }));
  }
  if (cv.header.contacts.length > 0) {
    children.push(contactsParagraph(cv.header.contacts));
  }

  children.push(new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ children: [new TextRun(cv.summary)] }));

  children.push(new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_2 }));
  for (const job of cv.experience) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${job.title}, ${job.company}`, bold: true })],
      })
    );
    children.push(new Paragraph({ children: [new TextRun({ text: job.dates, italics: true })] }));
    for (const project of job.projects) {
      if (project.name) {
        children.push(new Paragraph({ children: [new TextRun({ text: project.name, bold: true })] }));
      }
      for (const bullet of project.bullets) {
        children.push(new Paragraph({ text: bullet, bullet: { level: 0 } }));
      }
    }
  }

  children.push(new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_2 }));
  for (const group of cv.skills) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${group.category}: `, bold: true }),
          new TextRun(group.items.join(", ")),
        ],
      })
    );
  }

  if (cv.languages.length > 0) {
    children.push(new Paragraph({ text: "Languages", heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun(cv.languages.join(" | "))] }));
  }

  if (cv.education.length > 0) {
    children.push(new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_2 }));
    for (const entry of cv.education) {
      const line = [entry.degree, entry.school, entry.dates].filter(Boolean).join(" — ");
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }

  for (const section of cv.additionalSections) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }));
    for (const item of section.items) {
      children.push(new Paragraph({ text: item, bullet: { level: 0 } }));
    }
  }

  return children;
}

// TailoredDocument.contentJson is stored as Prisma Json (unknown at runtime) —
// validate it against the same schema the AI functions produce before
// rendering, rather than trusting the shape.
export function renderTailoredDocumentDocx(kind: TailoredKind, contentJson: unknown): Promise<Buffer> {
  if (kind === "cv") {
    const cv = tailoredCvSchema.parse(contentJson);
    return Packer.toBuffer(new Document({ sections: [{ children: renderCv(cv) }] }));
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
