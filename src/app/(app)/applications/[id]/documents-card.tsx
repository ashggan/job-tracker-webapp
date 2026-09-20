import { Download } from "lucide-react";
import type { TailoredKind } from "@prisma/client";

const DOCUMENT_KINDS: [TailoredKind, string][] = [
  ["cv", "CV used"],
  ["cover_letter", "Cover letter"],
  ["prep_notes", "Prep notes"],
  ["perks", "Perks summary"],
];

export function DocumentsCard({
  applicationId,
  docs,
}: {
  applicationId: string;
  docs: { id: string; kind: TailoredKind }[];
}) {
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
                  <a
                    href={`/api/applications/${applicationId}/documents/${doc.id}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-accent-foreground hover:bg-muted"
                  >
                    <Download className="size-3.5" />
                  </a>
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
                    <Download className="size-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
