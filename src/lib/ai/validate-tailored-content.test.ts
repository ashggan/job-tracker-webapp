import { describe, it, expect } from "vitest";
import { stripFabricatedContent } from "./validate-tailored-content";

const sections = {
  experience: [
    { company: "Acme Co", title: "Engineer", dates: "2020-2023", projects: [] },
  ],
  skills: [{ category: "Backend", items: ["Node.js", "Postgres"] }],
};

describe("stripFabricatedContent", () => {
  it("passes through skills/experience that exist in the source resume", () => {
    const result = stripFabricatedContent(
      {
        summary: "s",
        experience: [{ company: "Acme Co", title: "Engineer", dates: "2020-2023", projects: [] }],
        skills: [{ category: "Backend", items: ["Node.js"] }],
      },
      sections
    );
    expect(result.experience).toHaveLength(1);
    expect(result.skills).toEqual([{ category: "Backend", items: ["Node.js"] }]);
  });

  it("drops a fabricated skill item not present in the original resume", () => {
    const result = stripFabricatedContent(
      { summary: "s", experience: [], skills: [{ category: "Backend", items: ["Node.js", "Kubernetes"] }] },
      sections
    );
    expect(result.skills).toEqual([{ category: "Backend", items: ["Node.js"] }]);
  });

  it("drops an entire skill category if every item in it was fabricated", () => {
    const result = stripFabricatedContent(
      { summary: "s", experience: [], skills: [{ category: "Cloud", items: ["Kubernetes"] }] },
      sections
    );
    expect(result.skills).toEqual([]);
  });

  it("drops a fabricated experience entry not present in the original resume", () => {
    const result = stripFabricatedContent(
      {
        summary: "s",
        experience: [
          { company: "Acme Co", title: "Engineer", dates: "2020-2023", projects: [] },
          { company: "Fake Corp", title: "VP Engineering", dates: "2023-2024", projects: [] },
        ],
        skills: [],
      },
      sections
    );
    expect(result.experience).toEqual([
      { company: "Acme Co", title: "Engineer", dates: "2020-2023", projects: [] },
    ]);
  });
});
