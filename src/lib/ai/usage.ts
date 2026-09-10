import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  score: "Fit scoring",
  tailor_cv: "CV / letter tailoring",
  tailor_cover_letter: "CV / letter tailoring",
  extract_resume: "Resume extraction",
  extract_listing: "Listing extraction",
};

const DEFAULT_ROW_ORDER = ["Fit scoring", "CV / letter tailoring", "Resume extraction"];

export type UsageBreakdownRow = {
  label: string;
  calls: number;
  tokens: number;
};

export type UsageSummary = {
  periodStart: Date;
  periodEnd: Date;
  callsTotal: number;
  tokensTotal: number;
  breakdown: UsageBreakdownRow[];
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = startOfNextMonth(now);

  const logs = await prisma.aIUsageLog.findMany({
    where: { userId, createdAt: { gte: periodStart, lt: periodEnd } },
  });

  const byLabel = new Map<string, { calls: number; tokens: number }>();
  for (const label of DEFAULT_ROW_ORDER) {
    byLabel.set(label, { calls: 0, tokens: 0 });
  }

  let tokensTotal = 0;
  for (const log of logs) {
    tokensTotal += log.tokensUsed;
    const label = ACTION_LABELS[log.action] ?? log.action;
    const entry = byLabel.get(label) ?? { calls: 0, tokens: 0 };
    entry.calls += 1;
    entry.tokens += log.tokensUsed;
    byLabel.set(label, entry);
  }

  const breakdown: UsageBreakdownRow[] = Array.from(byLabel.entries()).map(([label, entry]) => ({
    label,
    calls: entry.calls,
    tokens: entry.tokens,
  }));

  return {
    periodStart,
    periodEnd,
    callsTotal: logs.length,
    tokensTotal,
    breakdown,
  };
}
