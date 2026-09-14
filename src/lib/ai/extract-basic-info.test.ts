import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/keys", () => ({ resolveActiveKey: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ getLanguageModel: vi.fn(() => "mock-model") }));
vi.mock("ai", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { aIUsageLog: { create: vi.fn() } } }));

import { extractBasicInfo } from "./extract-basic-info";
import { resolveActiveKey } from "@/lib/ai/keys";
import { generateObject } from "ai";
import { prisma } from "@/lib/prisma";

describe("extractBasicInfo", () => {
  beforeEach(() => {
    vi.mocked(resolveActiveKey).mockReset();
    vi.mocked(generateObject).mockReset();
    vi.mocked(prisma.aIUsageLog.create).mockReset();
  });

  it("returns null without calling the model when no API key is configured", async () => {
    vi.mocked(resolveActiveKey).mockResolvedValue(null);

    const result = await extractBasicInfo("user1", "resume text");

    expect(result).toBeNull();
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("returns the extracted fields and logs usage on success", async () => {
    vi.mocked(resolveActiveKey).mockResolvedValue({ provider: "anthropic", apiKey: "sk-test" } as never);
    const extracted = {
      name: "Jane Doe",
      title: "Senior Engineer",
      email: "jane@example.com",
      summary: "Backend engineer with 8 years of experience.",
    };
    vi.mocked(generateObject).mockResolvedValue({
      object: extracted,
      usage: { totalTokens: 500 },
    } as never);

    const result = await extractBasicInfo("user1", "resume text");

    expect(result).toEqual(extracted);
    expect(prisma.aIUsageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user1",
          action: "extract_resume",
          provider: "anthropic",
          keySource: "own_key",
        }),
      })
    );
  });

  it("returns null, not a throw, when the provider call fails (rate limit, timeout, etc.)", async () => {
    vi.mocked(resolveActiveKey).mockResolvedValue({ provider: "anthropic", apiKey: "sk-test" } as never);
    vi.mocked(generateObject).mockRejectedValue(new Error("rate limited"));

    const result = await extractBasicInfo("user1", "resume text");

    expect(result).toBeNull();
    expect(prisma.aIUsageLog.create).not.toHaveBeenCalled();
  });

  it("still returns a successful extraction even if the usage-log write itself fails", async () => {
    // A real regression: AIUsageLog's schema has drifted out from under this
    // branch in the shared dev DB (keySource column dropped elsewhere). A
    // logging failure must not discard an already-successful extraction.
    vi.mocked(resolveActiveKey).mockResolvedValue({ provider: "anthropic", apiKey: "sk-test" } as never);
    const extracted = { name: "Jane Doe", title: null, email: null, summary: null };
    vi.mocked(generateObject).mockResolvedValue({
      object: extracted,
      usage: { totalTokens: 500 },
    } as never);
    vi.mocked(prisma.aIUsageLog.create).mockRejectedValue(
      new Error('The column "AIUsageLog.keySource" does not exist')
    );

    const result = await extractBasicInfo("user1", "resume text");

    expect(result).toEqual(extracted);
  });
});
