"use server";

import { auth } from "@/lib/auth";
import { saveWizardDraft, discardWizardDraft, type WizardDraftData } from "@/lib/wizard/draft";

export async function saveWizardDraftAction(data: WizardDraftData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await saveWizardDraft(session.user.id, data);
}

export async function discardWizardDraftAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await discardWizardDraft(session.user.id);
}
