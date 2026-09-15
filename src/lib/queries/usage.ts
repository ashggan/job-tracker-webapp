import type { AIAction, LlmProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PROVIDER_LABELS } from "@/lib/ai/providers";

export const AI_ACTION_ORDER: AIAction[] = [
  "extract_listing",
  "score",
  "tailor_cv",
  "tailor_cover_letter",
  "extract_resume",
];

export const AI_ACTION_LABELS: Record<AIAction, string> = {
  extract_listing: "Posting extraction",
  score: "Fit scoring",
  tailor_cv: "CV tailoring",
  tailor_cover_letter: "Cover letter tailoring",
  extract_resume: "Resume extraction",
};

function providerLabel(provider: LlmProvider): string {
  return provider in PROVIDER_LABELS ? PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] : "Other";
}

export type UsageSummary = {
  resetsAt: Date;
  totalCalls: number;
  totalTokens: number;
  byAction: {
    action: AIAction;
    label: string;
    calls: number;
    tokens: number;
    providers: string; // comma-joined distinct provider labels used for this action
  }[];
};

// "This period" = the current calendar month -- there's no billing cycle of
// our own to align to (BYOK bills directly through the user's own
// provider), so the calendar month is the most legible reset point.
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const rows = await prisma.aIUsageLog.findMany({
    where: { userId, createdAt: { gte: startOfMonth } },
    select: { action: true, provider: true, tokensUsed: true },
  });

  const byAction = new Map<AIAction, { calls: number; tokens: number; providers: Set<LlmProvider> }>();
  for (const row of rows) {
    const entry = byAction.get(row.action) ?? { calls: 0, tokens: 0, providers: new Set<LlmProvider>() };
    entry.calls += 1;
    entry.tokens += row.tokensUsed;
    entry.providers.add(row.provider);
    byAction.set(row.action, entry);
  }

  return {
    resetsAt: startOfNextMonth,
    totalCalls: rows.length,
    totalTokens: rows.reduce((sum, r) => sum + r.tokensUsed, 0),
    byAction: AI_ACTION_ORDER.filter((action) => byAction.has(action)).map((action) => {
      const entry = byAction.get(action)!;
      return {
        action,
        label: AI_ACTION_LABELS[action],
        calls: entry.calls,
        tokens: entry.tokens,
        providers: [...entry.providers].map(providerLabel).join(", "),
      };
    }),
  };
}
