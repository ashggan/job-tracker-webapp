import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { StageCount, WeeklyApplicationStats, FunnelCount } from "@/lib/queries/dashboard-stats";

const FUNNEL_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"];

function StageCountsCard({ stageCounts }: { stageCounts: StageCount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage counts</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2 text-[13px]">
          {stageCounts.map((s) => (
            <div key={s.stage} className="flex items-center justify-between">
              <dt>{s.label}</dt>
              <dd className="font-medium">{s.count}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function WeeklyChartCard({ weekly }: { weekly: WeeklyApplicationStats }) {
  const maxCount = Math.max(1, ...weekly.weeks.map((w) => w.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications per week</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex h-24 items-end gap-2">
          {weekly.weeks.map((w) => (
            <div
              key={w.weekStart.toISOString()}
              className="flex-1 rounded-t bg-accent-foreground"
              style={{ height: `${Math.max(4, Math.round((w.count / maxCount) * 100))}%` }}
              title={`${w.count} application${w.count === 1 ? "" : "s"}`}
            />
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">
          Last 8 weeks
          {weekly.avgFitScore != null && <> · avg fit score {weekly.avgFitScore}</>}
        </p>
      </CardContent>
    </Card>
  );
}

function FunnelCard({ funnel }: { funnel: FunnelCount[] }) {
  const maxCount = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {funnel.map((f, i) => (
          <div key={f.stage} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[13px]">
              <span>{f.label}</span>
              <span className="font-medium">{f.count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${FUNNEL_COLORS[i % FUNNEL_COLORS.length]}`}
                style={{ width: `${Math.round((f.count / maxCount) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function StatsSection({
  stageCounts,
  weekly,
  funnel,
}: {
  stageCounts: StageCount[];
  weekly: WeeklyApplicationStats;
  funnel: FunnelCount[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-xl">Application stats</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <StageCountsCard stageCounts={stageCounts} />
        <WeeklyChartCard weekly={weekly} />
        <FunnelCard funnel={funnel} />
      </div>
    </section>
  );
}
