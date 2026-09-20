import type { Stage } from "@prisma/client";
import { STAGE_LABELS } from "@/lib/stages";

export function StageHistory({
  events,
}: {
  events: { id: string; fromStage: Stage | null; toStage: Stage; changedAt: Date }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Stage history</h3>
      <ul className="flex flex-col gap-2 text-[13px]">
        {events.map((event) => (
          <li key={event.id} className="flex items-center justify-between">
            <span>
              {event.fromStage ? `${STAGE_LABELS[event.fromStage]} → ` : ""}
              <span className="font-semibold">{STAGE_LABELS[event.toStage]}</span>
            </span>
            <span className="text-muted-foreground">{event.changedAt.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
