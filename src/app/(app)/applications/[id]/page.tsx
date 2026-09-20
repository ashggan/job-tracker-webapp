import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getApplicationForUser } from "@/lib/queries/applications";
import { Card, CardContent } from "@/components/ui/card";
import { HeaderSection } from "./header-section";
import { NotesLog } from "./notes-log";
import { StageHistory } from "./stage-history";
import { FitScoreCard } from "./fit-score-card";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-7 py-8">
      <HeaderSection
        applicationId={application.id}
        jobTitle={application.jobTitle}
        company={application.company}
        location={application.location ?? ""}
        postingUrl={application.postingUrl ?? ""}
        deadline={application.deadline ? application.deadline.toISOString().slice(0, 10) : ""}
        stage={application.stage}
        dateApplied={application.dateApplied ? application.dateApplied.toLocaleDateString() : null}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <FitScoreCard
                applicationId={application.id}
                fitScore={application.fitScore}
                fitLabel={application.fitLabel}
                fitStrengths={(application.fitStrengths as string[] | null) ?? []}
                fitGaps={(application.fitGaps as string[] | null) ?? []}
                fitRecommendation={application.fitRecommendation}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex flex-col gap-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Documents
                </h3>
                <div className="flex flex-col gap-2 text-[13px]">
                  {DOCUMENT_KINDS.map(([kind, label]) => (
                    <div key={kind} className="flex items-center justify-between">
                      <span>{label}</span>
                      <TailoredDocLink
                        applicationId={application.id}
                        docs={application.tailoredDocuments}
                        kind={kind}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <NotesLog applicationId={application.id} notes={application.notes} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <StageHistory events={application.stageEvents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
