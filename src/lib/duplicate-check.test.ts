import { describe, it, expect, vi, beforeEach } from "vitest";
import { findDuplicateApplications } from "./duplicate-check";
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

  it("falls back to a case-insensitive, trimmed company+title match on a repost (different URL)", async () => {
    findMany
      .mockResolvedValueOnce([]) // no URL match
      .mockResolvedValueOnce([
        { id: "2", company: "Acme", jobTitle: "Engineer", stage: "applied", createdAt: new Date() },
      ] as never);

    const result = await findDuplicateApplications("user1", {
      postingUrl: "https://boards.acme.com/jobs/999-reposted",
      company: "acme",
      jobTitle: "  Engineer  ",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
    expect(findMany).toHaveBeenCalledTimes(2);
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
    findMany.mockResolvedValueOnce([]);

    await findDuplicateApplications("user1", {
      postingUrl: null,
      company: "New Co",
      jobTitle: "Designer",
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          company: { equals: "New Co", mode: "insensitive" },
        }),
      })
    );
  });
});
