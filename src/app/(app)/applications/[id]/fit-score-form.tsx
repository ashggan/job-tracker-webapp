"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FitLabel } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { setFitScoreAction } from "@/lib/actions/applications";
import { FIT_LABEL_ORDER, FIT_META } from "@/lib/stages";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save fit assessment"}
    </Button>
  );
}

export function FitScoreForm({
  applicationId,
  fitScore,
  fitLabel,
  fitStrengths,
  fitGaps,
  fitRecommendation,
}: {
  applicationId: string;
  fitScore: number | null;
  fitLabel: FitLabel | null;
  fitStrengths: string[];
  fitGaps: string[];
  fitRecommendation: string | null;
}) {
  const [state, formAction] = useActionState(setFitScoreAction.bind(null, applicationId), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-4">
        <Field label="Score (0-10)">
          <Input
            name="fitScore"
            type="number"
            min={0}
            max={10}
            defaultValue={fitScore ?? ""}
            className="w-20"
          />
        </Field>
        <Field label="Label">
          <select
            name="fitLabel"
            defaultValue={fitLabel ?? ""}
            className="h-9 rounded-sm border border-input bg-card px-3.5 text-sm"
          >
            <option value="">Not scored</option>
            {FIT_LABEL_ORDER.map((l) => (
              <option key={l} value={l}>
                {FIT_META[l].label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Strengths (one per line)">
        <Textarea name="fitStrengths" rows={3} defaultValue={fitStrengths.join("\n")} />
      </Field>

      <Field label="Gaps (one per line)">
        <Textarea name="fitGaps" rows={3} defaultValue={fitGaps.join("\n")} />
      </Field>

      <Field label="Recommendation">
        <Input name="fitRecommendation" defaultValue={fitRecommendation ?? ""} />
      </Field>

      {state?.error && (
        <p className="text-[13px] text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <SaveButton />
      </div>
    </form>
  );
}
