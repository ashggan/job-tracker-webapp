"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { updatePreferencesAction } from "@/lib/actions/profile";

const PLACEHOLDER = `Target roles: Senior Product Designer, Design Lead
Locations: Remote (US/Canada), or Toronto on-site
Compensation floor: $130k base
Must-haves: remote-friendly, product (not agency) work
Dealbreakers: on-site only, no equity disclosure
Nice-to-haves: async-first culture, design systems ownership`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save preferences"}
    </Button>
  );
}

export function PreferencesForm({ initialText }: { initialText: string }) {
  const [state, formAction] = useActionState(updatePreferencesAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Target roles, locations, comp floor, must-haves, dealbreakers, nice-to-haves — used
          for aggregation filtering and as scoring context.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          <Textarea
            name="preferencesText"
            rows={8}
            placeholder={PLACEHOLDER}
            defaultValue={initialText}
          />
          {state?.error && (
            <p className="text-[13px] text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
