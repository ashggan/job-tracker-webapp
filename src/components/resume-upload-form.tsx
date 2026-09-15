"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type UploadResult =
  | { kind: "success"; wordCount: number; warning: string | null }
  | { kind: "error"; message: string };

export function ResumeUploadForm({ hasExistingResume }: { hasExistingResume: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UploadResult | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    setResult(null);
    startTransition(async () => {
      const response = await fetch("/api/resume", { method: "POST", body: formData });
      const body = await response.json();

      if (!response.ok) {
        setResult({ kind: "error", message: body.error ?? "Upload failed. Try again." });
        return;
      }

      setResult({ kind: "success", wordCount: body.wordCount, warning: body.warning });
      event.target.value = "";
      // The page is a server component reading UserResume directly --
      // refresh so the file row/preview reflect what was just saved.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        disabled={isPending}
        onChange={handleFileChange}
        aria-label={hasExistingResume ? "Replace resume" : "Upload resume"}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className="self-start"
      >
        {isPending ? (
          "Uploading…"
        ) : hasExistingResume ? (
          "Replace"
        ) : (
          <>
            <Upload data-icon="inline-start" />
            Upload resume
          </>
        )}
      </Button>

      {result?.kind === "success" && (
        <div className="rounded-sm border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-foreground">
          Parsed {result.wordCount} {result.wordCount === 1 ? "word" : "words"} from your resume.
          {result.warning && <p className="mt-1 text-destructive">{result.warning}</p>}
        </div>
      )}
      {result?.kind === "error" && <p className="text-sm text-destructive">{result.message}</p>}
    </div>
  );
}
