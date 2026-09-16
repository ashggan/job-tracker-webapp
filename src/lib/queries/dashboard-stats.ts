import type { Stage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/stages";

export type StageCount = { stage: Stage; label: string; count: number };

export async function getStageCounts(userId: string): Promise<StageCount[]> {
  const grouped = await prisma.application.groupBy({
    by: ["stage"],
    where: { userId },
    _count: true,
  });
  const counts = new Map(grouped.map((g) => [g.stage, g._count]));

  return STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: counts.get(stage) ?? 0,
  }));
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS_IN_WINDOW = 8;

export type WeeklyApplicationStats = {
  weeks: { weekStart: Date; count: number }[];
  avgFitScore: number | null;
};

// Pure bucketing logic, split out from the DB fetch so it's testable without
// mocking Prisma.
export function bucketWeeklyStats(
  rows: { dateFound: Date; fitScore: number | null }[],
  windowStart: Date
): WeeklyApplicationStats {
  const weeks = Array.from({ length: WEEKS_IN_WINDOW }, (_, i) => ({
    weekStart: new Date(windowStart.getTime() + i * WEEK_MS),
    count: 0,
  }));

  for (const row of rows) {
    const offsetMs = row.dateFound.getTime() - windowStart.getTime();
    const bucket = Math.min(WEEKS_IN_WINDOW - 1, Math.floor(offsetMs / WEEK_MS));
    if (bucket >= 0) weeks[bucket].count += 1;
  }

  const scored = rows.filter((r) => r.fitScore != null).map((r) => r.fitScore!);
  const avgFitScore =
    scored.length > 0 ? Math.round(scored.reduce((sum, s) => sum + s, 0) / scored.length) : null;

  return { weeks, avgFitScore };
}

// Buckets by dateFound (when the application was added/found), matching the
// existing "days" filter semantics in getTableRows -- consistent across the
// app for what "recent" means, rather than dateApplied (which is null for
// anything still in Wishlist).
export async function getWeeklyApplicationStats(userId: string): Promise<WeeklyApplicationStats> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WEEKS_IN_WINDOW * WEEK_MS);

  const rows = await prisma.application.findMany({
    where: { userId, dateFound: { gte: windowStart } },
    select: { dateFound: true, fitScore: true },
  });

  return bucketWeeklyStats(rows, windowStart);
}

export type FunnelCount = { stage: Stage; label: string; count: number };

const FUNNEL_STAGES: Stage[] = ["wishlist", "applied", "interview", "offer"];

// Pure reduction, split out from the DB fetch so it's testable without
// mocking Prisma: each application's highest stage index ever reached.
export function highestStageReached(
  events: { applicationId: string; toStage: Stage }[]
): Map<string, number> {
  const highest = new Map<string, number>();
  for (const event of events) {
    const idx = STAGE_ORDER.indexOf(event.toStage);
    const current = highest.get(event.applicationId) ?? -1;
    if (idx > current) highest.set(event.applicationId, idx);
  }
  return highest;
}

// "Reached this stage or later" (by STAGE_ORDER position), not "currently at
// this stage" -- an application interviewed and then rejected should still
// count toward Interview in the funnel, not disappear from it.
export async function getFunnelCounts(userId: string): Promise<FunnelCount[]> {
  const totalApplications = await prisma.application.count({ where: { userId } });

  const events = await prisma.stageEvent.findMany({
    where: {
      toStage: { in: ["applied", "interview", "offer"] },
      application: { userId },
    },
    select: { applicationId: true, toStage: true },
  });

  const reachedCounts = [...highestStageReached(events).values()];

  return FUNNEL_STAGES.map((stage) => {
    if (stage === "wishlist") {
      return { stage, label: STAGE_LABELS[stage], count: totalApplications };
    }
    const stageIdx = STAGE_ORDER.indexOf(stage);
    const count = reachedCounts.filter((idx) => idx >= stageIdx).length;
    return { stage, label: STAGE_LABELS[stage], count };
  });
}
