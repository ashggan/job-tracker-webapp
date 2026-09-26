import Link from "next/link";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FitBadge } from "@/components/fit-badge";
import { StageSelect } from "@/components/stage-select";
import { DeleteApplicationButton } from "@/components/delete-application-button";
import { auth } from "@/lib/auth";
import {
  getBoardColumns,
  getTableRows,
  getTableRowCount,
  TABLE_PAGE_SIZE,
  type TableFilters as Filters,
} from "@/lib/queries/applications";
import { isDueSoon } from "@/lib/stages";
import { cn } from "cn";
import { ApplicationsView } from "./applications-view";
import { BoardView } from "./board-view";
import type { Stage, FitLabel, TailoredKind } from "@prisma/client";

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

function SortHeader({
  column,
  label,
  currentSort,
  currentDir,
  searchParams,
}: {
  column: NonNullable<Filters["sort"]>;
  label: string;
  currentSort: string;
  currentDir: string;
  searchParams: Record<string, string | undefined>;
}) {
  const isActive = currentSort === column;
  const nextDir = isActive && currentDir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v) as [string, string][]
  );
  params.set("sort", column);
  params.set("dir", nextDir);

  const Icon = isActive ? (currentDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <Link href={`/job-applications?${params.toString()}`} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      <Icon className="size-3" />
    </Link>
  );
}

function TablePagination({
  page,
  totalPages,
  totalCount,
  searchParams,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  searchParams: Record<string, string | undefined>;
}) {
  function hrefForPage(target: number) {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v) as [string, string][]
    );
    params.set("page", String(target));
    return `/job-applications?${params.toString()}`;
  }

  const start = totalCount === 0 ? 0 : (page - 1) * TABLE_PAGE_SIZE + 1;
  const end = Math.min(page * TABLE_PAGE_SIZE, totalCount);

  return (
    <div className="flex items-center justify-between border-t border-border px-7 py-3 text-[13px] text-muted-foreground">
      <span>{totalCount === 0 ? "No applications" : `Showing ${start}–${end} of ${totalCount}`}</span>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className="hover:text-foreground">
            Previous
          </Link>
        ) : (
          <span className="opacity-50">Previous</span>
        )}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefForPage(page + 1)} className="hover:text-foreground">
            Next
          </Link>
        ) : (
          <span className="opacity-50">Next</span>
        )}
      </div>
    </div>
  );
}

export default async function TablePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const filters: Filters = {
    q: params.q,
    stage: params.stage as Stage | undefined,
    fitLabel: params.fit as FitLabel | undefined,
    days: params.days && params.days !== "all" ? Number(params.days) : undefined,
    sort: (params.sort as Filters["sort"]) ?? "dateApplied",
    dir: (params.dir as Filters["dir"]) ?? "desc",
  };

  // Board and Table are two components now, switched locally by
  // ApplicationsView -- both fetches happen up front so the toggle never
  // needs a server round-trip. ?view=board only picks the initial view
  // (e.g. for a bookmarked link).
  const [columns, totalCount] = await Promise.all([
    getBoardColumns(userId),
    getTableRowCount(userId, filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / TABLE_PAGE_SIZE));
  // Clamped against totalPages so a stale ?page= left over from a narrower
  // filter (or just typed by hand) can never request a page past the end.
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const rows = await getTableRows(userId, filters, { page });

  const tableContent = (
    <>
      <div className="overflow-x-auto px-7 pt-1.5">
        <Table>
          <TableHeader>
            <TableRow>
              {(
                [
                  ["dateApplied", "Date applied"],
                  ["jobTitle", "Job title"],
                  ["company", "Company"],
                ] as const
              ).map(([key, label]) => (
                <TableHead key={key} className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <SortHeader column={key} label={label} currentSort={filters.sort!} currentDir={filters.dir!} searchParams={params} />
                </TableHead>
              ))}
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Posting</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Location</TableHead>
              {(
                [
                  ["deadline", "Deadline"],
                  ["fitScore", "Fit"],
                  ["stage", "Status"],
                ] as const
              ).map(([key, label]) => (
                <TableHead key={key} className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <SortHeader column={key} label={label} currentSort={filters.sort!} currentDir={filters.dir!} searchParams={params} />
                </TableHead>
              ))}
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">CV used</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Cover letter</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Prep notes</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Notes / next steps</TableHead>
              <TableHead className="w-9" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="py-10 text-center text-sm text-muted-foreground">
                  No applications match these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.dateApplied ? row.dateApplied.toLocaleDateString() : "—"}</TableCell>
                <TableCell className="font-semibold">
                  <Link href={`/applications/${row.id}`} className="hover:underline">
                    {row.jobTitle}
                  </Link>
                </TableCell>
                <TableCell>{row.company}</TableCell>
                <TableCell>
                  {row.postingUrl ? (
                    <a
                      href={row.postingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-foreground hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{row.location || "—"}</TableCell>
                <TableCell
                  className={cn(isDueSoon(row.deadline) && "font-semibold text-destructive")}
                >
                  {row.deadline ? row.deadline.toLocaleDateString() : "—"}
                  {isDueSoon(row.deadline) && " · Due soon"}
                </TableCell>
                <TableCell>
                  <FitBadge label={row.fitLabel} />
                </TableCell>
                <TableCell>
                  <StageSelect applicationId={row.id} stage={row.stage} />
                </TableCell>
                <TableCell>
                  <TailoredDocLink applicationId={row.id} docs={row.tailoredDocuments} kind="cv" />
                </TableCell>
                <TableCell>
                  <TailoredDocLink applicationId={row.id} docs={row.tailoredDocuments} kind="cover_letter" />
                </TableCell>
                <TableCell>
                  <TailoredDocLink applicationId={row.id} docs={row.tailoredDocuments} kind="prep_notes" />
                </TableCell>
                <TableCell className="max-w-50 truncate text-muted-foreground">
                  {row.notes[0]?.body ?? "—"}
                </TableCell>
                <TableCell>
                  <DeleteApplicationButton applicationId={row.id} jobTitle={row.jobTitle} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePagination page={page} totalPages={totalPages} totalCount={totalCount} searchParams={params} />
    </>
  );

  return (
    <ApplicationsView
      defaultView={params.view === "board" ? "board" : "table"}
      board={<BoardView columns={columns} />}
      table={tableContent}
    />
  );
}
