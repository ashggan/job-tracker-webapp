"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/file-dropzone";
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
      <FileDropzone
        name="file"
        accept=".csv,.xlsx"
        label="Spreadsheet"
        hint="A .csv or .xlsx export from wherever you've been tracking applications. We'll clean it up and let you review before saving anything."
        required
        disabled={isPending}
      />

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
