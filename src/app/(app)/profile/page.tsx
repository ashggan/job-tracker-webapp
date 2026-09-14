import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeUploadForm } from "@/components/resume-upload-form";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const resume = await prisma.userResume.findUnique({ where: { userId } });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-7 py-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Upload your CV — this is what scoring and tailoring use for every application.
          Replacing it only affects future scoring and tailoring; documents already generated for
          past applications don&apos;t change.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>
            {resume
              ? `${resume.originalFilename} · ${resume.fileType} · uploaded ${resume.uploadedAt.toLocaleDateString()}`
              : "No resume uploaded yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {resume?.parseStatus === "LOW_CONFIDENCE" && resume.parseWarning && (
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {resume.parseWarning}
            </div>
          )}
          {resume && (
            <a
              href="/api/resume"
              className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Download current resume
            </a>
          )}
          <ResumeUploadForm hasExistingResume={Boolean(resume)} />
        </CardContent>
      </Card>
    </div>
  );
}
