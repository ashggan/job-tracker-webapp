import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getTableRows, type TableFilters } from "@/lib/queries/applications";
import { renderApplicationsXlsx } from "@/lib/xlsx-export";
import type { FitLabel, Stage } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const days = params.get("days");

  const filters: TableFilters = {
    q: params.get("q") ?? undefined,
    stage: (params.get("stage") as Stage) || undefined,
    fitLabel: (params.get("fit") as FitLabel) || undefined,
    days: days && days !== "all" ? Number(days) : undefined,
    sort: (params.get("sort") as TableFilters["sort"]) ?? "dateApplied",
    dir: (params.get("dir") as TableFilters["dir"]) ?? "desc",
  };

  try {
    const rows = await getTableRows(session.user.id, filters);
    const buffer = await renderApplicationsXlsx(rows);

    const filename = `Job Applications - ${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/applications/export]", error);
    return NextResponse.json({ error: "Couldn't generate the export" }, { status: 500 });
  }
}
