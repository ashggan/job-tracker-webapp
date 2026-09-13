"use client";

import { useState, useTransition } from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { extractPostingAction } from "@/lib/actions/wizard";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";

type Mode = "url" | "paste";

export function StepPosting({
  onExtracted,
}: {
  onExtracted: (postingUrl: string | undefined, data: ExtractedPosting) => void;
}) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedUrl = url.trim();

    startTransition(async () => {
      const result = await extractPostingAction({
        url: mode === "url" ? trimmedUrl : undefined,
        pastedText: mode === "paste" ? pastedText.trim() : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onExtracted(mode === "url" ? trimmedUrl : undefined, result.data);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-1 text-[13px] font-semibold">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={cn(
            "rounded-full px-3 py-1",
            mode === "url" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Paste a link
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={cn(
            "rounded-full px-3 py-1",
            mode === "paste" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Paste the description
        </button>
      </div>

      {mode === "url" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="url" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Posting link
          </Label>
          <Input
            id="url"
            type="text"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pastedText" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Job description
          </Label>
          <Textarea
            id="pastedText"
            rows={10}
            placeholder="Paste the full job posting text here…"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            required
          />
        </div>
      )}

      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Reading posting…" : "Continue"}
      </Button>
    </form>
  );
}
