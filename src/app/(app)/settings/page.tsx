import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountSection } from "./account-section";
import { ApiKeySection } from "./api-key-section";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, apiKeys] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.userApiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-7 py-8">
      <h2 className="text-2xl">Settings</h2>

      <AccountSection name={user.name ?? ""} email={user.email} />

      <hr className="border-border" />

      <ApiKeySection apiKeys={apiKeys} />

      <hr className="border-border" />

      <section>
        <h3 className="mb-1 text-xl">AI usage this period</h3>
        <p className="text-sm text-muted-foreground">Usage accounting and data export ship next.</p>
      </section>
    </div>
  );
}
