import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTailoredDocumentDocx } from "@/lib/docx-export";
import { renderTailoredDocumentMarkdown } from "@/lib/markdown-export";

const KIND_LABELS: Record<string, string> = {
  cv: "CV",
  cover_letter: "Cover Letter",
  prep_notes: "Interview Prep Notes",
  perks: "Salary & Perks",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, docId } = await params;

  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, jobTitle: true, company: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const document = await prisma.tailoredDocument.findFirst({
    where: { id: docId, applicationId: application.id },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const kindLabel = KIND_LABELS[document.kind] ?? document.kind;

    if (document.kind === "prep_notes" || document.kind === "perks") {
      const markdown = renderTailoredDocumentMarkdown(document.contentJson);
      const filename = `${application.company} - ${kindLabel} - ${application.jobTitle}.md`.replace(
        /[/\\?%*:|"<>]/g,
        "-"
      );
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const buffer = await renderTailoredDocumentDocx(document.kind, document.contentJson);
    const filename = `${application.company} - ${kindLabel} - ${application.jobTitle}.docx`.replace(
      /[/\\?%*:|"<>]/g,
      "-"
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/applications/[id]/documents/[docId]]", error);
    return NextResponse.json({ error: "Couldn't generate that document" }, { status: 500 });
  }
}
