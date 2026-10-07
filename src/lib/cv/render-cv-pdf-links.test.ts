import { describe, it, expect } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderCvToPdf } from "./render-cv-pdf";
import type { AssembledCv } from "./assemble-cv";

const cv: AssembledCv = {
  header: {
    name: "Jane Doe",
    title: "Software Engineer",
    contacts: ["jane@example.com", "github.com/janedoe", "San Francisco, CA"],
  },
  summary: "Backend engineer focused on APIs.",
  roles: [],
  skills: [],
  languages: [],
  education: [],
  additionalSections: [],
};

type LinkAnnotation = { subtype: string; url?: string };

describe("renderCvToPdf link annotations", () => {
  it("embeds a real link annotation for an email and a bare-domain contact, but not for a plain-text one", async () => {
    const buffer = await renderCvToPdf(cv);
    const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await doc.getPage(1);
    const annotations = (await page.getAnnotations()) as LinkAnnotation[];
    const linkUrls = annotations.filter((a) => a.subtype === "Link").map((a) => a.url);

    expect(linkUrls).toContain("mailto:jane@example.com");
    expect(linkUrls).toContain("https://github.com/janedoe");
    // "San Francisco, CA" must not produce a third link annotation.
    expect(linkUrls).toHaveLength(2);
  });
});
