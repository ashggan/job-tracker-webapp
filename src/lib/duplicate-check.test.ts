import { describe, it, expect, vi, beforeEach } from "vitest";
import { findDuplicateApplications, findDuplicateApplicationsForBatch } from "./duplicate-check";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
    },
  },
}));

const findMany = vi.mocked(prisma.application.findMany);

describe("findDuplicateApplications", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("matches on exact URL, ignoring tracking query params", async () => {
    findMany.mockResolvedValueOnce([
      {
        id: "1",
        company: "Acme",
        jobTitle: "Engineer",
        stage: "wishlist",
        createdAt: new Date(),
        postingUrl: "https://boards.acme.com/jobs/123",
      },
    ] as never);

    const result = await findDuplicateApplications("user1", {
      postingUrl: "https://www.boards.acme.com/jobs/123?utm_source=linkedin&utm_medium=social",
      company: "Acme",
      jobTitle: "Engineer",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("does not treat two different postings on the same generic ATS path as duplicates", async () => {
    // Indeed-style URLs put the actual job id in a query param, not the
    // path — stripping the whole query string used to collapse these to
    // the same normalized key.
    findMany.mockResolvedValueOnce([
      {
        id: "1",
        company: "Acme",
        jobTitle: "Engineer",
        stage: "wishlist",
        createdAt: new Date(),
        postingUrl: "https://www.indeed.com/viewjob?jk=aaaa1111",
      },
    ] as never);

    const result = await findDuplicateApplications("user1", {
      postingUrl: "https://indeed.com/viewjob?jk=bbbb2222",
      company: "Other Co",
      jobTitle: "Designer",
    });

    expect(result).toHaveLength(0);
  });

  it("falls back to a case-insensitive, trimmed company+title match on a repost (different URL)", async () => {
    findMany.mockResolvedValueOnce([
      {
        id: "2",
        company: "Acme",
        jobTitle: "Engineer",
        stage: "applied",
        createdAt: new Date(),
        postingUrl: null,
      },
    ] as never);

    const result = await findDuplicateApplications("user1", {
      postingUrl: "https://boards.acme.com/jobs/999-reposted",
      company: "acme",
      jobTitle: "  Engineer  ",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("returns no matches for a genuinely new application", async () => {
    findMany.mockResolvedValue([]);

    const result = await findDuplicateApplications("user1", {
      postingUrl: "https://newcompany.example/careers/1",
      company: "New Co",
      jobTitle: "Designer",
    });

    expect(result).toHaveLength(0);
  });

  it("skips the URL match path entirely when no postingUrl is given", async () => {
    findMany.mockResolvedValueOnce([
      {
        id: "3",
        company: "New Co",
        jobTitle: "Designer",
        stage: "wishlist",
        createdAt: new Date(),
        postingUrl: null,
      },
    ] as never);

    const result = await findDuplicateApplications("user1", {
      postingUrl: null,
      company: "New Co",
      jobTitle: "Designer",
    });

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});

describe("findDuplicateApplicationsForBatch", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("fetches the user's applications exactly once regardless of candidate count", async () => {
    findMany.mockResolvedValueOnce([
      {
        id: "1",
        company: "Acme",
        jobTitle: "Engineer",
        stage: "wishlist",
        createdAt: new Date(),
        postingUrl: "https://boards.acme.com/jobs/123",
      },
    ] as never);

    const results = await findDuplicateApplicationsForBatch("user1", [
      { postingUrl: "https://boards.acme.com/jobs/123", company: "Acme", jobTitle: "Engineer" },
      { postingUrl: null, company: "New Co", jobTitle: "Designer" },
      { postingUrl: null, company: "acme", jobTitle: "engineer" },
    ]);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(3);
    expect(results[0].map((m) => m.id)).toEqual(["1"]); // URL match
    expect(results[1]).toEqual([]); // genuinely new
    expect(results[2].map((m) => m.id)).toEqual(["1"]); // case-insensitive company+title match
  });
});
