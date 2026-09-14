"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadResult =
  | { kind: "success"; wordCount: number; warning: string | null }
  | { kind: "error"; message: string };

export function ResumeUploadForm({ hasExistingResume }: { hasExistingResume: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UploadResult | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setResult({ kind: "error", message: "Choose a file first." });
      return;
    }

    setResult(null);
    startTransition(async () => {
      const response = await fetch("/api/resume", { method: "POST", body: formData });
      const body = await response.json();

      if (!response.ok) {
        setResult({ kind: "error", message: body.error ?? "Upload failed. Try again." });
        return;
      }

      setResult({ kind: "success", wordCount: body.wordCount, warning: body.warning });
      formRef.current?.reset();
      // The page is a server component reading UserResume directly --
      // refresh so filename/date/download link reflect what was just saved.
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resume-file">
          {hasExistingResume ? "Replace resume" : "Upload resume"}
        </Label>
        <Input
          id="resume-file"
          name="file"
          type="file"
          accept=".pdf,.docx"
          required
          disabled={isPending}
        />
      </div>
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Uploading…" : hasExistingResume ? "Replace" : "Upload"}
      </Button>

      {result?.kind === "success" && (
        <div className="rounded-sm border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-foreground">
          Parsed {result.wordCount} {result.wordCount === 1 ? "word" : "words"} from your resume.
          {result.warning && <p className="mt-1 text-destructive">{result.warning}</p>}
        </div>
      )}
      {result?.kind === "error" && <p className="text-sm text-destructive">{result.message}</p>}
    </form>
  );
}
