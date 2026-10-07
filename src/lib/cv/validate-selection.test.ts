import { describe, it, expect } from "vitest";
import { validateSelection } from "./validate-selection";
import type { CvBaseContent } from "./schema";

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
  ],
  skills: [{ category: "Backend", skills: [{ skillId: "s1", text: "Node.js" }] }],
  languages: ["English"],
  education: [],
  additionalSections: [],
  summaryVariants: [{ variantId: "sv-1", text: "Backend engineer focused on APIs." }],
};

const validRaw = {
  summaryVariantId: "sv-1",
  roleSelections: [{ roleId: "role-1", bulletIds: ["b3", "b1"] }],
  skillIds: ["s1"],
};

describe("validateSelection", () => {
  it("accepts a well-formed selection that references real IDs", () => {
    const result = validateSelection(validRaw, base);
    expect(result.ok).toBe(true);
  });

  it("rejects a value that doesn't match the selection shape", () => {
    const result = validateSelection({ summaryVariantId: "sv-1" }, base);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/shape/);
  });

  it("rejects a non-object value", () => {
    const result = validateSelection("not an object", base);
    expect(result.ok).toBe(false);
  });

  it("rejects a role with fewer bullets than the configured minimum", () => {
    const result = validateSelection(
      { ...validRaw, roleSelections: [{ roleId: "role-1", bulletIds: ["b1"] }] },
      base
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/expected 2-5/);
  });

  it("rejects a role with more bullets than the configured maximum", () => {
    const result = validateSelection(
      { ...validRaw, roleSelections: [{ roleId: "role-1", bulletIds: ["b1", "b2", "b3", "b1", "b2", "b3"] }] },
      base
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/expected 2-5/);
  });

  it("rejects an unknown bulletId by surfacing assembleCV's error", () => {
    const result = validateSelection(
      { ...validRaw, roleSelections: [{ roleId: "role-1", bulletIds: ["not-real", "b1"] }] },
      base
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unknown bulletId/);
  });

  it("rejects an unknown summaryVariantId", () => {
    const result = validateSelection({ ...validRaw, summaryVariantId: "does-not-exist" }, base);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/summaryVariantId/);
  });

  it("rejects an unknown skillId", () => {
    const result = validateSelection({ ...validRaw, skillIds: ["not-real"] }, base);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unknown skillId/);
  });

  it("rejects a selection missing a role that exists in base", () => {
    const result = validateSelection({ ...validRaw, roleSelections: [] }, base);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/missing bullet selection/);
  });
});
