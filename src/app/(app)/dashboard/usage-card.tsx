import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatTokens, formatCost } from "@/lib/format";
import type { UsageSummary } from "@/lib/queries/usage";

function BarRow({ label, calls, share }: { label: string; calls: number; share: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[13px]">
        <span>{label}</span>
        <span className="text-muted-foreground">{calls} calls</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-accent-foreground"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function UsageCard({ usage }: { usage: UsageSummary }) {
  const maxActionCalls = Math.max(1, ...usage.byAction.map((a) => a.calls));

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI usage this period</CardTitle>
        <CardDescription>
          Resets{" "}
          {usage.resetsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex gap-8">
          <div>
            <div className="font-heading text-3xl font-bold">{usage.totalCalls}</div>
            <div className="text-[13px] text-muted-foreground">calls made</div>
          </div>
          <div>
            <div className="font-heading text-3xl font-bold">{formatTokens(usage.totalTokens)}</div>
            <div className="text-[13px] text-muted-foreground">tokens consumed</div>
          </div>
          <div>
            <div className="font-heading text-3xl font-bold">{formatCost(usage.totalCost)}</div>
            <div className="text-[13px] text-muted-foreground">est. cost</div>
          </div>
        </div>

        {usage.byAction.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                By action type
              </span>
              {usage.byAction.map((row) => (
                <BarRow
                  key={row.action}
                  label={row.label}
                  calls={row.calls}
                  share={row.calls / maxActionCalls}
                />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                By provider
              </span>
              {usage.byProvider.map((row) => (
                <BarRow key={row.provider} label={row.label} calls={row.calls} share={row.callShare} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">No AI usage yet this period.</p>
        )}

        <Link href="/settings" className="text-[13px] text-accent-foreground hover:underline">
          View details →
        </Link>
      </CardContent>
    </Card>
  );
}
