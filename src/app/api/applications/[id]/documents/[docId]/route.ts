import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTailoredDocumentDocx } from "@/lib/docx-export";

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

  const buffer = await renderTailoredDocumentDocx(document.kind, document.contentJson);
  const kindLabel = document.kind === "cv" ? "CV" : "Cover Letter";
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
}
