"use client";

import { useTransition } from "react";
import type { Stage } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/stages";
import { updateStageAction } from "@/lib/actions/applications";

const STAGE_ITEMS: Record<string, React.ReactNode> = Object.fromEntries(
  STAGE_ORDER.map((s) => [s, STAGE_LABELS[s]])
);

export function StageSelect({ applicationId, stage }: { applicationId: string; stage: Stage }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      items={STAGE_ITEMS}
      value={stage}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(() => {
          updateStageAction(applicationId, value as Stage);
        });
      }}
    >
      <SelectTrigger size="sm" className="h-7 rounded-full border-none bg-secondary px-2.5 text-xs font-semibold">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGE_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {STAGE_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
