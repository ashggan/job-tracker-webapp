"use client";

import { useActionState, useRef, useState } from "react";
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
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Notes & next steps
        </h3>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[13px] font-semibold text-accent-foreground hover:underline"
          >
            + Add
          </button>
        )}
      </div>

      {adding && (
        <form
          ref={formRef}
          action={(formData) => {
            formAction(formData);
            formRef.current?.reset();
            setAdding(false);
          }}
          className="flex flex-col gap-2"
        >
          <Textarea name="body" rows={2} placeholder="Add a note…" required autoFocus />
          {state?.error && (
            <p className="text-[13px] text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <div className="flex gap-2">
            <AddButton />
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <ul className="flex max-h-70 flex-col gap-4 overflow-y-auto">
        {notes.length === 0 && !adding && <li className="text-[13px] text-muted-foreground">No notes yet.</li>}
        {notes.map((note) => (
          <li key={note.id} className="text-[13px]">
            <p className="text-[11px] text-muted-foreground">
              {note.createdAt.toLocaleDateString()} ·{" "}
              {note.createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="whitespace-pre-line">{note.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
