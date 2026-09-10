import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS } from "@/lib/stages";

const COLUMNS = [
  "Date found",
  "Date applied",
  "Job title",
  "Company",
  "Posting URL",
  "Location",
  "Source",
  "Stage",
  "Fit score",
  "Fit label",
] as const;

// Neutralize formula injection (CWE-1236): a leading =, +, -, or @ makes
// Excel/Sheets execute the cell as a formula when the CSV is opened.
function csvEscape(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function toDateString(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    orderBy: { dateFound: "desc" },
  });

  const rows = applications.map((app) =>
    [
      toDateString(app.dateFound),
      toDateString(app.dateApplied),
      app.jobTitle,
      app.company,
      app.postingUrl ?? "",
      app.location ?? "",
      app.source,
      STAGE_LABELS[app.stage],
      app.fitScore?.toString() ?? "",
      app.fitLabel ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );

  const csv = [COLUMNS.join(","), ...rows].join("\n");
  const filename = `jota-applications-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
