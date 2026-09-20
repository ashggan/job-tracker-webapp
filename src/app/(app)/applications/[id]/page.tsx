import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getApplicationForUser } from "@/lib/queries/applications";
import { StageSelect } from "@/components/stage-select";
import { FitBadge } from "@/components/fit-badge";
import { EditForm } from "./edit-form";
import { NotesLog } from "./notes-log";
import type { TailoredKind } from "@prisma/client";

const DOCUMENT_KINDS: [TailoredKind, string][] = [
  ["cv", "CV"],
  ["cover_letter", "Cover letter"],
  ["prep_notes", "Interview prep notes"],
  ["perks", "Salary & perks summary"],
];

function TailoredDocLink({
  applicationId,
  docs,
  kind,
}: {
  applicationId: string;
  docs: { id: string; kind: TailoredKind }[];
  kind: TailoredKind;
}) {
  const doc = docs.find((d) => d.kind === kind);
  if (!doc) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={`/api/applications/${applicationId}/documents/${doc.id}`}
      className="text-accent-foreground hover:underline"
    >
      Download
    </a>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const application = await getApplicationForUser(session!.user.id, id);
  if (!application) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-7 py-8">
      <div>
        <Link
          href="/table"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to table
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl">{application.jobTitle}</h2>
          <StageSelect applicationId={application.id} stage={application.stage} />
        </div>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {application.company}
          <FitBadge label={application.fitLabel} />
        </p>
      </div>

      <EditForm
        applicationId={application.id}
        jobTitle={application.jobTitle}
        company={application.company}
        postingUrl={application.postingUrl ?? ""}
        location={application.location ?? ""}
        deadline={application.deadline ? application.deadline.toISOString().slice(0, 10) : ""}
      />

      <hr className="border-border" />

      <div className="flex flex-col gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Documents</h3>
        <div className="flex flex-col gap-2 text-[13px]">
          {DOCUMENT_KINDS.map(([kind, label]) => (
            <div key={kind} className="flex items-center justify-between">
              <span>{label}</span>
              <TailoredDocLink applicationId={application.id} docs={application.tailoredDocuments} kind={kind} />
            </div>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      <NotesLog applicationId={application.id} notes={application.notes} />
    </div>
  );
}
