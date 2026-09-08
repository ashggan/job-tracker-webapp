"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createApplicationAction } from "@/lib/actions/applications";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Adding…" : "Add to Wishlist"}
    </Button>
  );
}

export function NewApplicationForm({ defaultUrl }: { defaultUrl?: string }) {
  const [state, formAction] = useActionState(createApplicationAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jobTitle" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Job title
        </Label>
        <Input id="jobTitle" name="jobTitle" placeholder="Senior Product Designer" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Company
        </Label>
        <Input id="company" name="company" placeholder="Fernback Studio" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="postingUrl" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Posting link
        </Label>
        <Input
          id="postingUrl"
          name="postingUrl"
          type="text"
          placeholder="https://…"
          defaultValue={defaultUrl}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Location
        </Label>
        <Input id="location" name="location" placeholder="Remote" />
      </div>

      {state?.error && (
        <p className="text-[13px] text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
