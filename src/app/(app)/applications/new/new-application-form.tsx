"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles, AlertCircle } from "lucide-react";
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

export function NewApplicationForm({
  defaultUrl,
  defaultJobTitle,
  defaultCompany,
  defaultLocation,
  extractionFailed,
}: {
  defaultUrl?: string;
  defaultJobTitle?: string;
  defaultCompany?: string;
  defaultLocation?: string;
  extractionFailed?: boolean;
}) {
  const [state, formAction] = useActionState(createApplicationAction, undefined);
  const extracted = Boolean(defaultJobTitle || defaultCompany || defaultLocation);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {extracted && (
        <p className="flex items-center gap-1.5 text-[13px] text-accent-foreground">
          <Sparkles className="size-3.5" />
          Filled in from the posting — double-check before saving.
        </p>
      )}
      {extractionFailed && (
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <AlertCircle className="size-3.5" />
          Couldn&apos;t detect the title or company from that link — fill them in below.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jobTitle" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Job title
        </Label>
        <Input
          id="jobTitle"
          name="jobTitle"
          placeholder="Senior Product Designer"
          defaultValue={defaultJobTitle}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Company
        </Label>
        <Input
          id="company"
          name="company"
          placeholder="Fernback Studio"
          defaultValue={defaultCompany}
          required
        />
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
        <Input
          id="location"
          name="location"
          placeholder="Remote"
          defaultValue={defaultLocation}
        />
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
