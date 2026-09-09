"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { encrypt, maskKey } from "@/lib/crypto";
import { validateProviderKey, PROVIDER_LABELS, SUPPORTED_PROVIDERS } from "@/lib/ai/providers";

export type ActionState = { error?: string; success?: string } | undefined;

const accountSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export async function updateAccountAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing && existing.id !== session.user.id) {
    return { error: "An account with that email already exists" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, email: parsed.data.email },
  });

  revalidatePath("/settings");
  return { success: "Account details saved" };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: "Password updated" };
}

const addApiKeySchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
  apiKey: z.string().trim().min(1, "Enter an API key"),
});

export async function addApiKeyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = addApiKeySchema.safeParse({
    provider: formData.get("provider"),
    apiKey: formData.get("apiKey"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a provider and enter an API key" };
  }

  const { valid, error } = await validateProviderKey(parsed.data.provider, parsed.data.apiKey);
  if (!valid) {
    return { error: error ?? "That key couldn't be validated" };
  }

  await prisma.$transaction([
    prisma.userApiKey.deleteMany({
      where: { userId: session.user.id, provider: parsed.data.provider },
    }),
    prisma.userApiKey.updateMany({
      where: { userId: session.user.id },
      data: { isActive: false },
    }),
  ]);
  await prisma.userApiKey.create({
    data: {
      userId: session.user.id,
      provider: parsed.data.provider,
      encryptedKey: encrypt(parsed.data.apiKey),
      keyPreview: maskKey(parsed.data.apiKey),
      isActive: true,
    },
  });

  revalidatePath("/settings");
  return { success: `${PROVIDER_LABELS[parsed.data.provider]} key added and activated` };
}

export async function activateApiKeyAction(keyId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const key = await prisma.userApiKey.findFirst({
    where: { id: keyId, userId: session.user.id },
  });
  if (!key) return;

  await prisma.$transaction([
    prisma.userApiKey.updateMany({
      where: { userId: session.user.id },
      data: { isActive: false },
    }),
    prisma.userApiKey.update({ where: { id: keyId }, data: { isActive: true } }),
  ]);

  revalidatePath("/settings");
}

export async function removeApiKeyAction(keyId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.userApiKey.deleteMany({ where: { id: keyId, userId: session.user.id } });

  revalidatePath("/settings");
}
