"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Stage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/stages";
import { bulkSaveImportedApplicationsAction, type ImportReviewRow } from "@/lib/actions/import-applications";

const STAGE_ITEMS: Record<string, React.ReactNode> = Object.fromEntries(
  STAGE_ORDER.map((s) => [s, STAGE_LABELS[s]])
);

export function StepReview({ rows, onBack }: { rows: ImportReviewRow[]; onBack: () => void }) {
  const router = useRouter();
  const [localRows, setLocalRows] = useState<ImportReviewRow[]>(() => rows.map((r) => ({ ...r })));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const includedCount = localRows.filter((r) => r.included).length;

  function setIncluded(i: number, included: boolean) {
    setLocalRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, included } : r)));
  }

  function setStage(i: number, stage: Stage) {
    setLocalRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, stage } : r)));
  }

  function handleSave() {
    const selected = localRows.filter((r) => r.included);
    if (selected.length === 0) {
      setError("Select at least one row to import.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await bulkSaveImportedApplicationsAction(
        selected.map((r) => ({
          jobTitle: r.jobTitle,
          company: r.company,
          stage: r.stage,
          postingUrl: r.postingUrl,
          location: r.location,
          dateApplied: r.dateApplied,
          deadline: r.deadline,
          note: r.note,
        }))
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/job-applications");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted-foreground">
        {includedCount} of {localRows.length} application{localRows.length === 1 ? "" : "s"} will be
        imported.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Job Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Applied</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localRows.map((row, i) => (
            <TableRow key={i}>
              <TableCell>
                <Checkbox
                  checked={row.included}
                  onCheckedChange={(checked) => setIncluded(i, checked === true)}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    {row.jobTitle}
                    {row.postingUrl && (
                      <a
                        href={row.postingUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open posting link"
                      >
                        <ExternalLink className="size-3.5 text-muted-foreground" />
                      </a>
                    )}
                  </span>
                  {row.duplicates.length > 0 && (
                    <Link
                      href={`/applications/${row.duplicates[0].id}`}
                      className="text-[12px] text-muted-foreground hover:underline"
                    >
                      Possible duplicate — View
                    </Link>
                  )}
                  {row.duplicateOfRow != null && (
                    <span className="text-[12px] text-muted-foreground">
                      Duplicate of row {row.duplicateOfRow + 1} above
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{row.company}</TableCell>
              <TableCell>
                <Select items={STAGE_ITEMS} value={row.stage} onValueChange={(v) => v && setStage(i, v as Stage)}>
                  <SelectTrigger className="w-36 rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{row.location ?? "—"}</TableCell>
              <TableCell>{row.dateApplied ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button type="button" size="lg" onClick={handleSave} disabled={isPending || includedCount === 0}>
          {isPending ? "Importing…" : `Import ${includedCount} application${includedCount === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
