import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getResumeDownloadUrl, resumeFilenameFromKey } from "@/lib/storage";
import { isProfileComplete, parseResumeStructured } from "@/lib/profile";
import { ResumeUploadForm } from "./resume-upload-form";
import { ResumeStructuredForm } from "./resume-structured-form";
import { PreferencesForm } from "./preferences-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  const resumeDownloadUrl = profile?.resumeFileUrl
    ? await getResumeDownloadUrl(profile.resumeFileUrl)
    : null;
  const resumeFilename = profile?.resumeFileUrl
    ? resumeFilenameFromKey(profile.resumeFileUrl)
    : null;

  const complete = isProfileComplete(profile);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-7 py-8">
      <div>
        <h2 className="mb-1 text-2xl">Profile &amp; preferences</h2>
        <p className="text-sm text-muted-foreground">
          This is what scoring, tailoring, and aggregation filtering will run against once
          those ship.
        </p>
      </div>

      {!complete && (
        <p className="rounded-lg bg-accent/40 px-4 py-3 text-[13px] text-accent-foreground">
          Add a resume and your preferences below — required before scoring, tailoring, and
          aggregation filtering are useful.
        </p>
      )}

      <ResumeUploadForm
        resumeFilename={resumeFilename}
        resumeDownloadUrl={resumeDownloadUrl}
      />

      <ResumeStructuredForm initial={parseResumeStructured(profile?.resumeStructured ?? null)} />

      <PreferencesForm initialText={profile?.preferencesText ?? ""} />
    </div>
  );
}
