import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { LlmProvider } from "@prisma/client";

export type ResolvedKey = { provider: LlmProvider; apiKey: string };

// Resolves which key/provider an AI call should run on for this user (§5.8) —
// BYOK only, no shared/default fallback. Returns null when the user hasn't
// added an active key yet, which every AI feature must check for before
// calling out. Not called by any AI feature yet — scoring/tailoring/extraction
// (M7/M8) will call this before every request once they exist.
export async function resolveActiveKey(userId: string): Promise<ResolvedKey | null> {
  const activeKey = await prisma.userApiKey.findFirst({
    where: { userId, isActive: true },
  });
  if (!activeKey) return null;

  return {
    provider: activeKey.provider,
    apiKey: decrypt(activeKey.encryptedKey),
  };
}
