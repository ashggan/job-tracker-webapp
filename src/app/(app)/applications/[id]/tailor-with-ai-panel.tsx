"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  retailorCoverLetterAction,
  reviseCoverLetterAction,
  updateTailoredDocumentContentAction,
} from "@/lib/actions/tailored-documents";

type PendingAction = "regenerate" | "ask" | "save" | null;

export function TailorWithAiPanel({
  applicationId,
  company,
  docId: initialDocId,
  initialBody,
  descriptionText,
}: {
  applicationId: string;
  company: string;
  docId: string | null;
  initialBody: string | null;
  descriptionText: string;
}) {
  const [docId, setDocId] = useState(initialDocId);
  const [body, setBody] = useState(initialBody ?? "");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  function handleRegenerate() {
    setPendingAction("regenerate");
    setError(null);
    startTransition(async () => {
      const result = await retailorCoverLetterAction(applicationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody(result.body);
      setDocId(result.docId);
    });
  }

  function handleInsertJobDescription() {
    setBody((prev) => (prev ? `${prev}\n\n${descriptionText}` : descriptionText));
  }

  function handleSave() {
    if (!docId) return;
    setPendingAction("save");
    setError(null);
    startTransition(async () => {
      const result = await updateTailoredDocumentContentAction(docId, body);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleAsk() {
    if (!instruction.trim()) return;
    setPendingAction("ask");
    setError(null);
    startTransition(async () => {
      const result = await reviseCoverLetterAction(applicationId, body, instruction.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody(result.body);
      setInstruction("");
    });
  }

  return (
    <div id="tailor-with-ai" className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-heading text-xl">Tailor with AI</h3>
      </div>
      <p className="text-[13px] text-muted-foreground">
        Drafting a cover letter for {company}, tuned to the job description.
      </p>

      {docId ? (
        <>
          <Textarea
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="text-[13px]"
          />
          {error && (
            <p className="text-[13px] text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRegenerate} disabled={isPending}>
                {isPending && pendingAction === "regenerate" ? "Regenerating…" : "Regenerate"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleInsertJobDescription}
                disabled={!descriptionText}
              >
                Insert job description
              </Button>
            </div>
            <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
              {isPending && pendingAction === "save" ? "Saving…" : saved ? "Saved" : "Save draft"}
            </Button>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='Ask the assistant to revise — e.g. "make the second paragraph shorter"'
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={handleAsk} disabled={isPending || !instruction.trim()}>
              {isPending && pendingAction === "ask" ? "Asking…" : "Ask"}
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" onClick={handleRegenerate} disabled={isPending}>
          {isPending ? "Generating…" : "Generate cover letter"}
        </Button>
      )}
    </div>
  );
}
