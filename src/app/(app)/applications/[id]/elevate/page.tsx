import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getApplicationPostingFieldsForUser } from "@/lib/queries/applications";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";
import { ElevateShell } from "./elevate-shell";

export default async function ElevateApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const application = await getApplicationPostingFieldsForUser(session!.user.id, id);
  if (!application) notFound();

  // Nothing to score/tailor against yet -- add posting details on the detail
  // page first (see the "Add posting details" card).
  if (!application.descriptionText) redirect(`/applications/${id}`);

  const extracted: ExtractedPosting = {
    jobTitle: application.jobTitle,
    company: application.company,
    description: application.descriptionText,
    requirements: (application.requirements as string[] | null) ?? [],
    niceToHaves: (application.niceToHaves as string[] | null) ?? [],
    keywords: (application.keywords as string[] | null) ?? [],
    location: application.location,
    deadline: application.deadline ? application.deadline.toISOString().slice(0, 10) : null,
    // Not read by StepFitScore/StepMaterials -- ElevateShell always offers a
    // cover letter via StepMaterials' own wantsCoverLetter prop instead.
    wantsCoverLetter: true,
  };

  return (
    <div className="mx-auto max-w-2xl px-7 py-8">
      <h2 className="mb-1 text-2xl">Score & tailor with AI</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {application.jobTitle} at {application.company}
      </p>
      <ElevateShell applicationId={application.id} extracted={extracted} />
    </div>
  );
}
