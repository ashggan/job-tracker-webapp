import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadWizardDraft } from "./draft";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wizardDraft: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const findUnique = vi.mocked(prisma.wizardDraft.findUnique);
const deleteMany = vi.mocked(prisma.wizardDraft.deleteMany);

const validExtracted = {
  jobTitle: "Engineer",
  company: "Acme",
  description: "Build things.",
  requirements: ["TypeScript"],
  niceToHaves: [],
  keywords: ["TypeScript"],
  location: null,
  deadline: null,
  wantsCoverLetter: true,
};

const validFit = {
  fitScore: 7,
  fitLabel: "good",
  fitStrengths: ["Strong TS background"],
  fitGaps: [],
  fitRecommendation: "7/10 — worth tailoring",
};

const baseRow = {
  id: "draft1",
  userId: "user1",
  step: "materials",
  postingUrl: "https://example.com/job",
  extracted: validExtracted,
  extras: null,
  fit: validFit,
  fitFor: "sig-1",
  cv: null,
  cvFor: null,
  coverLetter: null,
  coverLetterFor: null,
  updatedAt: new Date(),
};

describe("loadWizardDraft", () => {
  beforeEach(() => {
    findUnique.mockReset();
    deleteMany.mockReset();
  });

  it("returns null when no draft exists", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await loadWizardDraft("user1")).toBeNull();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("hydrates a valid draft, preserving posting-signature fields", async () => {
    findUnique.mockResolvedValueOnce(baseRow as never);
    const result = await loadWizardDraft("user1");
    expect(result?.step).toBe("materials");
    expect(result?.extracted.jobTitle).toBe("Engineer");
    expect(result?.fit).toEqual(validFit);
    expect(result?.fitFor).toBe("sig-1");
    expect(result?.cv).toBeNull();
  });

  it("discards and returns null when the core `extracted` field is corrupt", async () => {
    findUnique.mockResolvedValueOnce({ ...baseRow, extracted: { jobTitle: 123 } } as never);
    const result = await loadWizardDraft("user1");
    expect(result).toBeNull();
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "user1" } });
  });

  it("drops just the corrupt piece (fit) rather than the whole draft", async () => {
    findUnique.mockResolvedValueOnce({ ...baseRow, fit: { fitScore: "not-a-number" } } as never);
    const result = await loadWizardDraft("user1");
    expect(result).not.toBeNull();
    expect(result?.fit).toBeNull();
    expect(result?.fitFor).toBeNull(); // signature dropped alongside the invalid data it tagged
    expect(result?.extracted.jobTitle).toBe("Engineer"); // rest of the draft survives
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("falls back to the review step when the stored step isn't a known one", async () => {
    findUnique.mockResolvedValueOnce({ ...baseRow, step: "not-a-real-step" } as never);
    const result = await loadWizardDraft("user1");
    expect(result?.step).toBe("review");
  });
});
