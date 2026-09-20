import { cn } from "cn";
import type { Stage } from "@prisma/client";
import { STAGE_LABELS } from "@/lib/stages";

export function StageHistory({
  events,
}: {
  events: { id: string; toStage: Stage; changedAt: Date }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Stage history</h3>
      <ul className="flex flex-col gap-3">
        {events.map((event, i) => (
          <li key={event.id} className="flex items-start gap-2.5">
            <span
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", i === 0 ? "bg-primary" : "bg-border")}
            />
            <div>
              <p className={cn("text-[13px]", i === 0 ? "font-semibold" : "text-muted-foreground")}>
                {STAGE_LABELS[event.toStage]}
              </p>
              <p className="text-[11px] text-muted-foreground">{event.changedAt.toLocaleDateString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
