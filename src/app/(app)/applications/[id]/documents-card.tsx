"use client";

import { useState, useTransition } from "react";
import { Download, Eye, Sparkles } from "lucide-react";
import type { TailoredKind } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { tailoredCvSchema, coverLetterSchema } from "@/lib/ai/tailor-cv";
import { applicationEmailSchema } from "@/lib/ai/generate-application-email";
import { renderTailoredDocumentMarkdown } from "@/lib/markdown-export";
import { generateApplicationEmailAction } from "@/lib/actions/tailored-documents";

const DOCUMENT_KINDS: [TailoredKind, string][] = [
  ["cv", "CV used"],
  ["cover_letter", "Cover letter"],
  ["prep_notes", "Prep notes"],
  ["perks", "Perks summary"],
  ["application_email", "Application email"],
];

// Every other kind here comes pre-generated from the wizard/tailoring flow
// and has a docx/markdown file to download. This one is meant to be
// generated on the spot and copied straight into an email client, so it
// gets a Generate/Regenerate button instead of a Download link.
const GENERATE_ONLY: TailoredKind = "application_email";

type Doc = { id: string; kind: TailoredKind; contentJson: unknown };

function CvPreview({ contentJson }: { contentJson: unknown }) {
  const cv = tailoredCvSchema.parse(contentJson);
  return (
    <div className="flex flex-col gap-4 text-[13px]">
      {(cv.header.name || cv.header.title) && (
        <div>
          {cv.header.name && <p className="font-semibold">{cv.header.name}</p>}
          {cv.header.title && <p className="text-muted-foreground">{cv.header.title}</p>}
        </div>
      )}
      <p>{cv.summary}</p>
      {cv.experience.map((job) => (
        <div key={`${job.company}-${job.title}`} className="flex flex-col gap-1">
          <p className="font-semibold">
            {job.title}, {job.company} <span className="font-normal text-muted-foreground">· {job.dates}</span>
          </p>
          {job.projects.map((project, i) => (
            <ul key={project.name ?? i} className="flex flex-col gap-0.5">
              {project.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          ))}
        </div>
      ))}
      {cv.skills.length > 0 && (
        <div className="flex flex-col gap-1">
          {cv.skills.map((group) => (
            <p key={group.category}>
              <span className="font-semibold">{group.category}:</span> {group.items.join(", ")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationEmailPreview({ contentJson }: { contentJson: unknown }) {
  const email = applicationEmailSchema.parse(contentJson);
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <p>
        <span className="font-semibold">Subject:</span> {email.subject}
      </p>
      <p className="whitespace-pre-line">{email.body}</p>
    </div>
  );
}

function DocumentBody({ kind, contentJson }: { kind: TailoredKind; contentJson: unknown }) {
  if (kind === "cv") return <CvPreview contentJson={contentJson} />;
  if (kind === "cover_letter") {
    const letter = coverLetterSchema.parse(contentJson);
    return <p className="whitespace-pre-line text-[13px]">{letter.body}</p>;
  }
  if (kind === "application_email") return <ApplicationEmailPreview contentJson={contentJson} />;
  return <p className="whitespace-pre-wrap text-[13px]">{renderTailoredDocumentMarkdown(contentJson)}</p>;
}

export function DocumentsCard({
  applicationId,
  docs: initialDocs,
}: {
  applicationId: string;
  docs: Doc[];
}) {
  const [docs, setDocs] = useState(initialDocs);
  const [viewing, setViewing] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const kindLabel = viewing ? DOCUMENT_KINDS.find(([k]) => k === viewing.kind)?.[1] : null;

  function handleGenerateApplicationEmail() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await generateApplicationEmailAction(applicationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const doc: Doc = { id: result.docId, kind: "application_email", contentJson: result.data };
      setDocs((prev) => [doc, ...prev.filter((d) => d.kind !== "application_email")]);
      setViewing(doc);
    });
  }

  function handleCopy() {
    if (!viewing) return;
    const email = applicationEmailSchema.parse(viewing.contentJson);
    void navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-xl">Documents</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DOCUMENT_KINDS.map(([kind, label]) => {
          const doc = docs.find((d) => d.kind === kind);
          return (
            <div key={kind} className="flex flex-col gap-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {label}
              </h4>
              <div className="flex items-center justify-between gap-2 rounded-full bg-secondary py-1.5 pr-1.5 pl-4">
                <span className="truncate text-[13px]">{doc ? "Ready" : "Not generated"}</span>
                {doc ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setViewing(doc)}
                      className="flex size-7 items-center justify-center rounded-full bg-card text-accent-foreground hover:bg-muted"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    {kind !== GENERATE_ONLY && (
                      <a
                        href={`/api/applications/${applicationId}/documents/${doc.id}`}
                        className="flex size-7 items-center justify-center rounded-full bg-card text-accent-foreground hover:bg-muted"
                      >
                        <Download className="size-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  kind === GENERATE_ONLY && (
                    <button
                      type="button"
                      onClick={handleGenerateApplicationEmail}
                      disabled={isPending}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-accent-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && !viewing && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}

      <Dialog open={viewing != null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{kindLabel}</DialogTitle>
          </DialogHeader>
          {viewing && <DocumentBody kind={viewing.kind} contentJson={viewing.contentJson} />}
          {viewing?.kind === GENERATE_ONLY && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {error && (
                <p className="text-[13px] text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateApplicationEmail}
                  disabled={isPending}
                >
                  {isPending ? "Regenerating…" : "Regenerate"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
