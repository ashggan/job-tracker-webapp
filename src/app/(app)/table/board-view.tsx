import { Clock } from "lucide-react";
import { BoardTableToggle } from "@/components/board-table-toggle";
import { StageSelect } from "@/components/stage-select";
import { DeleteApplicationButton } from "@/components/delete-application-button";
import { FitBadge } from "@/components/fit-badge";
import { STAGE_LABELS, daysSince } from "@/lib/stages";
import type { getBoardColumns } from "@/lib/queries/applications";

export function BoardView({ columns }: { columns: Awaited<ReturnType<typeof getBoardColumns>> }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-end border-b border-border px-7 py-4">
        <BoardTableToggle />
      </div>

      <div className="flex gap-4 overflow-x-auto px-7 py-5.5">
        {columns.map(({ stage, jobs }) => (
          <div key={stage} className="w-52 flex-none">
            <div className="mb-3 flex items-baseline gap-2 pb-2.5">
              <h4 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h4>
              <span className="text-xs text-muted-foreground">{jobs.length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {jobs.length === 0 && (
                <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  No jobs yet
                </div>
              )}
              {jobs.map((job) => (
                <div key={job.id} className="flex flex-col gap-2 rounded-lg bg-card p-3.5 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-bold leading-tight">{job.jobTitle}</span>
                    <DeleteApplicationButton applicationId={job.id} jobTitle={job.jobTitle} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ""}
                  </div>
                  <FitBadge label={job.fitLabel} />
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                      {job.source === "manual" ? "Manual" : job.source}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-2.75" />
                      {daysSince(job.updatedAt)}d
                    </span>
                  </div>
                  <StageSelect applicationId={job.id} stage={job.stage} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
