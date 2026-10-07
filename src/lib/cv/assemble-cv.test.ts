import { describe, it, expect } from "vitest";
import { assembleCV } from "./assemble-cv";
import type { CvBaseContent, CvVariantSelection } from "./schema";

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
        { bulletId: "b3", text: "Reduced query latency by 40%" },
      ],
    },
    {
      roleId: "role-2",
      company: "Beta Inc",
      title: "Engineer",
      dates: "2018-2021",
      bullets: [{ bulletId: "b4", text: "Built the reporting dashboard" }],
    },
  ],
  skills: [
    {
      category: "Backend",
      skills: [
        { skillId: "s1", text: "Node.js" },
        { skillId: "s2", text: "Postgres" },
      ],
    },
    {
      category: "Frontend",
      skills: [{ skillId: "s3", text: "React" }],
    },
  ],
  languages: ["English"],
  education: [{ school: "State University", degree: "B.S. Computer Science", dates: "2014-2018" }],
  additionalSections: [{ heading: "Certifications", items: ["AWS Certified Developer"] }],
  summaryVariants: [
    { variantId: "sv-1", text: "Backend engineer focused on APIs." },
    { variantId: "sv-2", text: "Full-stack engineer with a data focus." },
  ],
};

const variant: CvVariantSelection = {
  summaryVariantId: "sv-1",
  roleSelections: [
    { roleId: "role-1", bulletIds: ["b3", "b1"] },
    { roleId: "role-2", bulletIds: ["b4"] },
  ],
  skillIds: ["s2", "s1", "s3"],
};

describe("assembleCV", () => {
  it("produces identical output for the same base and variant called twice", () => {
    expect(assembleCV(base, variant)).toEqual(assembleCV(base, variant));
  });

  it("every bullet in the output exists verbatim in the base", () => {
    const allBaseBullets = new Set(base.roles.flatMap((r) => r.bullets.map((b) => b.text)));
    const result = assembleCV(base, variant);
    for (const role of result.roles) {
      for (const bullet of role.bullets) {
        expect(allBaseBullets.has(bullet)).toBe(true);
      }
    }
  });

  it("orders bullets within a role by the variant's selection order, not base order", () => {
    const result = assembleCV(base, variant);
    expect(result.roles[0].bullets).toEqual(["Reduced query latency by 40%", "Shipped the checkout API"]);
  });

  it("orders roles by base order regardless of the variant's roleSelections order", () => {
    const reordered: CvVariantSelection = {
      ...variant,
      roleSelections: [...variant.roleSelections].reverse(),
    };
    const result = assembleCV(base, reordered);
    expect(result.roles.map((r) => r.company)).toEqual(["Acme Co", "Beta Inc"]);
  });

  it("includes only selected skills, grouped under base's category order", () => {
    const result = assembleCV(base, { ...variant, skillIds: ["s3", "s1"] });
    expect(result.skills).toEqual([
      { category: "Backend", items: ["Node.js"] },
      { category: "Frontend", items: ["React"] },
    ]);
  });

  it("drops a skill category entirely when none of its skills are selected", () => {
    const result = assembleCV(base, { ...variant, skillIds: ["s1"] });
    expect(result.skills).toEqual([{ category: "Backend", items: ["Node.js"] }]);
  });

  it("copies header, languages, education, and additionalSections through verbatim", () => {
    const result = assembleCV(base, variant);
    expect(result.header).toEqual(base.header);
    expect(result.languages).toEqual(base.languages);
    expect(result.education).toEqual(base.education);
    expect(result.additionalSections).toEqual(base.additionalSections);
  });

  it("resolves the summary from the selected summaryVariantId", () => {
    const result = assembleCV(base, { ...variant, summaryVariantId: "sv-2" });
    expect(result.summary).toBe("Full-stack engineer with a data focus.");
  });

  it("throws on an unknown summaryVariantId", () => {
    expect(() => assembleCV(base, { ...variant, summaryVariantId: "does-not-exist" })).toThrow(/summaryVariantId/);
  });

  it("throws on an unknown bulletId within a role", () => {
    const bad: CvVariantSelection = {
      ...variant,
      roleSelections: [{ roleId: "role-1", bulletIds: ["not-real"] }, variant.roleSelections[1]],
    };
    expect(() => assembleCV(base, bad)).toThrow(/unknown bulletId/);
  });

  it("throws on an unknown skillId", () => {
    expect(() => assembleCV(base, { ...variant, skillIds: ["not-real"] })).toThrow(/unknown skillId/);
  });

  it("throws when the variant is missing a selection for a role that exists in base", () => {
    const bad: CvVariantSelection = {
      ...variant,
      roleSelections: [variant.roleSelections[0]], // role-2 missing
    };
    expect(() => assembleCV(base, bad)).toThrow(/missing bullet selection/);
  });
});
