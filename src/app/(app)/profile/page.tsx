import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeUploadForm } from "@/components/resume-upload-form";

type BasicInfo = {
  name: string | null;
  title: string | null;
  email: string | null;
  summary: string | null;
};

// basicInfo is a derived, AI-written JSON cache (never hand-edited), but
// still untyped at the DB layer -- validate loosely rather than trust it.
function asBasicInfo(value: unknown): BasicInfo | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const info: BasicInfo = {
    name: typeof v.name === "string" ? v.name : null,
    title: typeof v.title === "string" ? v.title : null,
    email: typeof v.email === "string" ? v.email : null,
    summary: typeof v.summary === "string" ? v.summary : null,
  };
  return info.name || info.title || info.email || info.summary ? info : null;
}

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const resume = await prisma.userResume.findUnique({ where: { userId } });
  const basicInfo = asBasicInfo(resume?.basicInfo);

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
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {resume ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3.5">
              <div className="flex items-center gap-3">
                <FileText className="size-4 shrink-0 text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{resume.originalFilename}</span>
                  <span className="text-xs text-muted-foreground">
                    Uploaded {resume.uploadedAt.toLocaleDateString()} · {resume.fileType}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="/api/resume"
                  title="Download current resume"
                  aria-label="Download current resume"
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Download className="size-4" />
                </a>
                <ResumeUploadForm hasExistingResume />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
              <ResumeUploadForm hasExistingResume={false} />
            </div>
          )}

          {resume?.parseStatus === "LOW_CONFIDENCE" && resume.parseWarning && (
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {resume.parseWarning}
            </div>
          )}

          {basicInfo && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/50 px-3.5 py-3">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Preview (as parsed)
              </div>
              {basicInfo.name && <div className="text-sm font-semibold">{basicInfo.name}</div>}
              {basicInfo.title && <div className="text-sm text-muted-foreground">{basicInfo.title}</div>}
              {basicInfo.email && <div className="text-sm text-muted-foreground">{basicInfo.email}</div>}
              {basicInfo.summary && <p className="mt-1 text-sm">{basicInfo.summary}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
