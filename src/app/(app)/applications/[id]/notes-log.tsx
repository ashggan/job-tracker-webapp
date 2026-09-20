"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addNoteAction } from "@/lib/actions/notes";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Adding…" : "Add note"}
    </Button>
  );
}

export function NotesLog({
  applicationId,
  notes,
}: {
  applicationId: string;
  notes: { id: string; body: string; createdAt: Date }[];
}) {
  const [state, formAction] = useActionState(addNoteAction.bind(null, applicationId), undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Notes / next steps
      </h3>

      <form
        ref={formRef}
        action={(formData) => {
          formAction(formData);
          formRef.current?.reset();
        }}
        className="flex flex-col gap-2"
      >
        <Textarea name="body" rows={2} placeholder="Add a note…" required />
        {state?.error && (
          <p className="text-[13px] text-destructive" role="alert">
            {state.error}
          </p>
        )}
        <div>
          <AddButton />
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {notes.length === 0 && <li className="text-[13px] text-muted-foreground">No notes yet.</li>}
        {notes.map((note) => (
          <li key={note.id} className="rounded-lg border border-border p-3 text-[13px]">
            <p className="whitespace-pre-line">{note.body}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{note.createdAt.toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
