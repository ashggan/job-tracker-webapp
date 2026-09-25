import { describe, it, expect } from "vitest";
import { buildPostingSignature } from "./posting-signature";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";

const base: ExtractedPosting = {
  jobTitle: "Engineer",
  company: "Acme",
  description: "Build things.",
  requirements: ["TypeScript"],
  niceToHaves: [],
  keywords: ["TypeScript"],
  location: "Remote",
  deadline: null,
  wantsCoverLetter: true,
};

describe("buildPostingSignature", () => {
  it("is stable for identical fit/materials-relevant fields", () => {
    expect(buildPostingSignature(base)).toBe(buildPostingSignature({ ...base }));
  });

  it("changes when the job title changes", () => {
    expect(buildPostingSignature(base)).not.toBe(
      buildPostingSignature({ ...base, jobTitle: "Senior Engineer" })
    );
  });

  it("changes when the description changes", () => {
    expect(buildPostingSignature(base)).not.toBe(
      buildPostingSignature({ ...base, description: "Build other things." })
    );
  });

  it("changes when requirements change", () => {
    expect(buildPostingSignature(base)).not.toBe(
      buildPostingSignature({ ...base, requirements: ["TypeScript", "React"] })
    );
  });

  it("ignores fields fit/materials generation never reads (location, deadline, keywords)", () => {
    expect(buildPostingSignature(base)).toBe(
      buildPostingSignature({
        ...base,
        location: "Onsite",
        deadline: "2026-12-01",
        keywords: ["React"],
      })
    );
  });
});
