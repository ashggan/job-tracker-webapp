"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadAndCleanApplicationsAction, type ImportReviewRow } from "@/lib/actions/import-applications";

export function StepUpload({
  onUploaded,
}: {
  onUploaded: (rows: ImportReviewRow[], truncated: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file first.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await uploadAndCleanApplicationsAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onUploaded(result.rows, result.truncated);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="import-file" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Spreadsheet
        </Label>
        <Input id="import-file" name="file" type="file" accept=".csv,.xlsx" required disabled={isPending} />
        <p className="text-[13px] text-muted-foreground">
          A .csv or .xlsx export from wherever you&apos;ve been tracking applications. We&apos;ll clean it up
          and let you review before saving anything.
        </p>
      </div>

      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Reading & cleaning…" : "Continue"}
      </Button>
    </form>
  );
}
