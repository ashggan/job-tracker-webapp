import { describe, it, expect } from "vitest";
import { renderCvToPdf } from "./render-cv-pdf";
import type { AssembledCv } from "./assemble-cv";

const cv: AssembledCv = {
  header: { name: "Jane Doe", title: "Software Engineer", contacts: ["jane@example.com", "github.com/janedoe"] },
  summary: "Backend engineer focused on APIs.",
  roles: [
    {
      company: "Acme Co",
      title: "Senior Engineer",
      dates: "2021-Present",
      bullets: ["Shipped the checkout API", "Reduced query latency by 40%"],
    },
  ],
  skills: [{ category: "Backend", items: ["Node.js", "Postgres"] }],
  languages: ["English"],
  education: [{ school: "State University", degree: "B.S. Computer Science", dates: "2014-2018" }],
  additionalSections: [{ heading: "Certifications", items: ["AWS Certified Developer"] }],
};

describe("renderCvToPdf", () => {
  it("produces a non-empty buffer starting with the PDF magic header", async () => {
    const buffer = await renderCvToPdf(cv);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("renders successfully with every optional section empty", async () => {
    const minimal: AssembledCv = {
      header: { name: null, title: null, contacts: [] },
      summary: "A short summary.",
      roles: [],
      skills: [],
      languages: [],
      education: [],
      additionalSections: [],
    };
    const buffer = await renderCvToPdf(minimal);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
