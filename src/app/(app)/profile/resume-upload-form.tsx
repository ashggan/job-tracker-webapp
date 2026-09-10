"use client";

import { useActionState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { uploadResumeAction, removeResumeAction } from "@/lib/actions/profile";

export function ResumeUploadForm({
  resumeFilename,
  resumeDownloadUrl,
}: {
  resumeFilename: string | null;
  resumeDownloadUrl: string | null;
}) {
  const [state, formAction] = useActionState(uploadResumeAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume</CardTitle>
        <CardDescription>
          Your base CV, kept as the tailoring template — PDF or DOCX, 10MB max.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {resumeFilename && resumeDownloadUrl && (
          <div className="flex items-center gap-2.5 rounded-lg border border-border px-3.5 py-2.5">
            <FileText className="size-4 text-muted-foreground" />
            <a
              href={resumeDownloadUrl}
              className="flex-1 truncate text-sm font-medium text-foreground hover:underline"
            >
              {resumeFilename}
            </a>
            <form action={removeResumeAction}>
              <Button type="submit" variant="ghost" size="icon-sm" aria-label="Remove resume">
                <Trash2 className="size-4" />
              </Button>
            </form>
          </div>
        )}

        <form action={formAction} className="flex items-center gap-3">
          <input
            type="file"
            name="resume"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
            className="flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3.5 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground"
          />
          <SubmitButton size="sm" pendingLabel="Uploading…">
            Upload
          </SubmitButton>
        </form>
        {state?.error && (
          <p className="text-[13px] text-destructive" role="alert">
            {state.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
