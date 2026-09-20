"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { updateInterviewPrepNotesAction } from "@/lib/actions/applications";

export function InterviewPrepNotes({
  applicationId,
  initialNotes,
}: {
  applicationId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleBlur() {
    if (notes === initialNotes) return;
    startTransition(async () => {
      await updateInterviewPrepNotesAction(applicationId, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Interview prep notes
        </h3>
        {(isPending || saved) && (
          <span className="text-[11px] text-muted-foreground">{isPending ? "Saving…" : "Saved"}</span>
        )}
      </div>
      <Textarea
        rows={5}
        placeholder="Panel format, who you'll meet, topics to prepare…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        className="text-[13px]"
      />
    </div>
  );
}
