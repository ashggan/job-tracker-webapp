import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLUMNS = [
  "Date applied",
  "Job title",
  "Company",
  "Posting",
  "Location",
  "Fit",
  "Status",
  "CV used",
  "Cover letter",
  "Prep notes",
  "Notes / next steps",
];

export default function TablePage() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-7 py-4">
        <Input placeholder="Search jobs, companies..." disabled className="max-w-58" />
        {["Stage: All", "Fit: All", "Source: All", "Date: Last 90 days"].map((label) => (
          <Select key={label} disabled>
            <SelectTrigger className="w-40 rounded-sm">
              <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{label}</SelectItem>
            </SelectContent>
          </Select>
        ))}
      </div>

      <div className="overflow-x-auto px-7 pb-7 pt-1.5">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead key={col} className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="py-10 text-center text-sm text-muted-foreground">
                No applications yet — add one from the board.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
