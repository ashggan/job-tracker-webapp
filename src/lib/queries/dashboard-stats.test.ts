import { describe, expect, it } from "vitest";
import { bucketWeeklyStats, highestStageReached } from "./dashboard-stats";

describe("bucketWeeklyStats", () => {
  const windowStart = new Date("2026-07-01T00:00:00Z");
  const dayMs = 24 * 60 * 60 * 1000;

  it("buckets applications into the correct week", () => {
    const result = bucketWeeklyStats(
      [
        { dateFound: new Date(windowStart.getTime() + 1 * dayMs), fitScore: null }, // week 0
        { dateFound: new Date(windowStart.getTime() + 8 * dayMs), fitScore: null }, // week 1
        { dateFound: new Date(windowStart.getTime() + 9 * dayMs), fitScore: null }, // week 1
      ],
      windowStart
    );

    expect(result.weeks[0].count).toBe(1);
    expect(result.weeks[1].count).toBe(2);
    expect(result.weeks.length).toBe(8);
  });

  it("clamps a date past the window into the last bucket instead of dropping it", () => {
    const result = bucketWeeklyStats(
      [{ dateFound: new Date(windowStart.getTime() + 100 * dayMs), fitScore: null }],
      windowStart
    );
    expect(result.weeks[7].count).toBe(1);
  });

  it("averages only non-null fit scores", () => {
    const result = bucketWeeklyStats(
      [
        { dateFound: windowStart, fitScore: 80 },
        { dateFound: windowStart, fitScore: 60 },
        { dateFound: windowStart, fitScore: null },
      ],
      windowStart
    );
    expect(result.avgFitScore).toBe(70);
  });

  it("returns null avg when nothing has a fit score yet", () => {
    const result = bucketWeeklyStats([{ dateFound: windowStart, fitScore: null }], windowStart);
    expect(result.avgFitScore).toBeNull();
  });
});

describe("highestStageReached", () => {
  it("tracks the furthest stage per application", () => {
    const result = highestStageReached([
      { applicationId: "a1", toStage: "applied" },
      { applicationId: "a1", toStage: "interview" },
      { applicationId: "a2", toStage: "applied" },
    ]);
    expect(result.get("a1")).toBe(3); // interview index in STAGE_ORDER (wishlist,applied,under_review,interview)
    expect(result.get("a2")).toBe(1); // applied index
  });

  it("keeps the highest stage even if a later, lower-index event arrives", () => {
    // e.g. an application interviewed, then a stale/out-of-order "applied" event
    const result = highestStageReached([
      { applicationId: "a1", toStage: "interview" },
      { applicationId: "a1", toStage: "applied" },
    ]);
    expect(result.get("a1")).toBe(3);
  });

  it("returns an empty map for no events", () => {
    expect(highestStageReached([]).size).toBe(0);
  });
});
