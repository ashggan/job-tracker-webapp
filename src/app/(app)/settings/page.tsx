import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUsageSummary } from "@/lib/ai/usage";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccountSection } from "./account-section";
import { ApiKeySection } from "./api-key-section";

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return n.toString();
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, apiKeys, usage] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.userApiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    getUsageSummary(session.user.id),
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
        <p className="mb-4 text-[13px] text-muted-foreground">
          Resets{" "}
          {usage.periodEnd.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="mb-4 flex gap-7">
          <div>
            <div className="font-heading text-2xl font-bold">{usage.callsTotal}</div>
            <div className="text-xs text-muted-foreground">calls made</div>
          </div>
          <div>
            <div className="font-heading text-2xl font-bold">{formatTokens(usage.tokensTotal)}</div>
            <div className="text-xs text-muted-foreground">tokens consumed</div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b-2 border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Calls</th>
                <th className="px-3 py-2">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {usage.breakdown.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2">{row.calls}</td>
                  <td className="px-3 py-2">{formatTokens(row.tokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr className="border-border" />

      <section>
        <h3 className="mb-2.5 text-xl">Data</h3>
        <a href="/api/export" className={cn(buttonVariants({ variant: "outline" }))}>
          <Download className="size-4" />
          Export all data (CSV)
        </a>
      </section>
    </div>
  );
}
