import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { LlmProvider } from "@prisma/client";

export type ResolvedKey = { provider: LlmProvider; apiKey: string };

// Resolves which key/provider an AI call should run on for this user (§5.8)
// -- BYOK only, no shared/default fallback. Returns null when the user
// hasn't added an active key yet; every AI feature must handle that as a
// normal, expected state, not an error.
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
