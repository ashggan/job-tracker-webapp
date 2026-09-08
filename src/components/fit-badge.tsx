import type { FitLabel } from "@prisma/client";
import { FIT_META } from "@/lib/stages";

export function FitBadge({ label }: { label: FitLabel | null }) {
  if (!label) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        Not scored
      </span>
    );
  }

  const meta = FIT_META[label];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-xs font-bold"
      style={{ background: meta.light, color: meta.color }}
    >
      <span className="size-1.75 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
