import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getApplicationForUser } from "@/lib/queries/applications";
import { getLatestTailoredDocument } from "@/lib/queries/tailored-documents";
import { Card, CardContent } from "@/components/ui/card";
import { HeaderSection } from "./header-section";
import { NotesLog } from "./notes-log";
import { StageHistory } from "./stage-history";
import { FitScoreCard } from "./fit-score-card";
import { RecordCard } from "./record-card";
import { InterviewPrepNotes } from "./interview-prep-notes";
import { DocumentsCard } from "./documents-card";
import { TailorWithAiPanel } from "./tailor-with-ai-panel";
import { coverLetterSchema } from "@/lib/ai/tailor-cv";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const application = await getApplicationForUser(session!.user.id, id);
  if (!application) notFound();

  const latestCoverLetter = await getLatestTailoredDocument(application.id, "cover_letter");
  const coverLetterParsed = latestCoverLetter
    ? coverLetterSchema.safeParse(latestCoverLetter.contentJson)
    : null;

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
              <DocumentsCard applicationId={application.id} docs={application.tailoredDocuments} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <TailorWithAiPanel
                applicationId={application.id}
                company={application.company}
                docId={latestCoverLetter?.id ?? null}
                initialBody={coverLetterParsed?.success ? coverLetterParsed.data.body : null}
                descriptionText={application.descriptionText ?? ""}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <RecordCard
                postingUrl={application.postingUrl}
                source={application.source}
                dateFound={application.dateFound}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <InterviewPrepNotes
                applicationId={application.id}
                initialNotes={application.interviewPrepNotes ?? ""}
              />
            </CardContent>
          </Card>

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
