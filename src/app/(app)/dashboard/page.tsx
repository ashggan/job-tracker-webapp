import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUsageSummary } from "@/lib/queries/usage";
import { getStageCounts, getWeeklyApplicationStats, getFunnelCounts } from "@/lib/queries/dashboard-stats";
import { UsageCard } from "./usage-card";
import { StatsSection } from "./stats-section";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [usage, stageCounts, weekly, funnel] = await Promise.all([
    getUsageSummary(session.user.id),
    getStageCounts(session.user.id),
    getWeeklyApplicationStats(session.user.id),
    getFunnelCounts(session.user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-7 py-8">
      <h2 className="text-2xl">Dashboard</h2>

      <UsageCard usage={usage} />

      <StatsSection stageCounts={stageCounts} weekly={weekly} funnel={funnel} />
    </div>
  );
}
