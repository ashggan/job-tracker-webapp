import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { UsageSummary } from "@/lib/queries/usage";

function formatTokens(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
}

// Rough estimate, not billing-accurate (see ROUGH_COST_PER_1M_TOKENS in the
// AI call sites) -- under a cent still real usage, just not worth implying
// false precision with "$0.00".
function formatCost(cost: number): string {
  return cost > 0 && cost < 0.01 ? "<$0.01" : `$${cost.toFixed(2)}`;
}

export function UsageSection({ usage }: { usage: UsageSummary }) {
  return (
    <section>
      <h3 className="text-xl">AI usage this period</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Resets{" "}
        {usage.resetsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>

      <div className="mt-4 flex gap-10">
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
        <Table className="mt-5">
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Action
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Calls
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Tokens
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Cost
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Provider
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usage.byAction.map((row) => (
              <TableRow key={row.action}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.calls}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{formatTokens(row.tokens)}</span>
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-accent-foreground"
                        style={{ width: `${Math.round(row.tokenShare * 100)}%` }}
                      />
                    </div>
                    <span className="text-[12px] text-muted-foreground">
                      {Math.round(row.tokenShare * 100)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatCost(row.cost)}</TableCell>
                <TableCell className="text-muted-foreground">{row.providers}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="mt-5 text-[13px] text-muted-foreground">No AI usage yet this period.</p>
      )}
    </section>
  );
}
