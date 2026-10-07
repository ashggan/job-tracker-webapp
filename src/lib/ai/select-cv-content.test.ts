import { describe, it, expect } from "vitest";
import { describeBaseForPrompt } from "./select-cv-content";
import type { CvBaseContent } from "@/lib/cv/schema";

const base: CvBaseContent = {
  header: { name: "Jane Doe", title: "Software Engineer", contacts: ["jane@example.com"] },
  roles: [
    {
      roleId: "role-1",
      company: "Acme Co",
      title: "Senior Engineer",
      dates: "2021-Present",
      bullets: [
        { bulletId: "b1", text: "Shipped the checkout API" },
        { bulletId: "b2", text: "Mentored two junior engineers" },
      ],
    },
  ],
  skills: [{ category: "Backend", skills: [{ skillId: "s1", text: "Node.js" }] }],
  languages: ["English"],
  education: [],
  additionalSections: [],
  summaryVariants: [
    { variantId: "sv-1", text: "Backend engineer focused on APIs." },
    { variantId: "sv-2", text: "Full-stack engineer with a data focus." },
  ],
};

describe("describeBaseForPrompt", () => {
  const result = describeBaseForPrompt(base);

  it("includes every roleId with its company, title, and dates", () => {
    expect(result).toContain("roleId: role-1 (Senior Engineer, Acme Co, 2021-Present)");
  });

  it("includes every bulletId paired with its exact text", () => {
    expect(result).toContain("[b1] Shipped the checkout API");
    expect(result).toContain("[b2] Mentored two junior engineers");
  });

  it("includes every skillId paired with its exact text, under its category", () => {
    expect(result).toContain("Backend: [s1] Node.js");
  });

  it("includes every summaryVariantId paired with its exact text", () => {
    expect(result).toContain("[sv-1] Backend engineer focused on APIs.");
    expect(result).toContain("[sv-2] Full-stack engineer with a data focus.");
  });

  it("instructs that every role must appear in the selection", () => {
    expect(result).toMatch(/every roleId.*must appear/);
  });
});
