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
import { DeleteApplicationButton } from "@/components/delete-application-button";
import { auth } from "@/lib/auth";
import { getTableRows, getDistinctSources, type TableFilters as Filters } from "@/lib/queries/applications";
import { STAGE_LABELS } from "@/lib/stages";
import { TableFilters } from "./table-filters";
import type { Stage, FitLabel } from "@prisma/client";

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
    <Link href={`/table?${params.toString()}`} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      <Icon className="size-3" />
    </Link>
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
    source: params.source,
    days: params.days && params.days !== "all" ? Number(params.days) : undefined,
    sort: (params.sort as Filters["sort"]) ?? "dateApplied",
    dir: (params.dir as Filters["dir"]) ?? "desc",
  };

  const [rows, sources] = await Promise.all([
    getTableRows(userId, filters),
    getDistinctSources(userId),
  ]);

  return (
    <div className="flex flex-col">
      <TableFilters sources={sources} />

      <div className="overflow-x-auto px-7 pb-7 pt-1.5">
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
                <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                  No applications match these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.dateApplied ? row.dateApplied.toLocaleDateString() : "—"}</TableCell>
                <TableCell className="font-semibold">{row.jobTitle}</TableCell>
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
                <TableCell>
                  <FitBadge label={row.fitLabel} />
                </TableCell>
                <TableCell>{STAGE_LABELS[row.stage]}</TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.interviewPrepNotes ? "Yes" : "—"}
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
    </div>
  );
}
