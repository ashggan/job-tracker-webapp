"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateApplicationAction } from "@/lib/actions/applications";

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
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function EditForm({
  applicationId,
  jobTitle,
  company,
  postingUrl,
  location,
  deadline,
}: {
  applicationId: string;
  jobTitle: string;
  company: string;
  postingUrl: string;
  location: string;
  deadline: string;
}) {
  const [state, formAction] = useActionState(updateApplicationAction.bind(null, applicationId), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Job title">
        <Input name="jobTitle" defaultValue={jobTitle} required />
      </Field>

      <Field label="Company">
        <Input name="company" defaultValue={company} required />
      </Field>

      <Field label="Posting link">
        <Input name="postingUrl" type="text" placeholder="https://…" defaultValue={postingUrl} />
      </Field>

      <Field label="Location">
        <Input name="location" placeholder="Remote" defaultValue={location} />
      </Field>

      <Field label="Deadline (YYYY-MM-DD, leave blank if none)">
        <Input name="deadline" placeholder="2026-12-15" defaultValue={deadline} />
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
