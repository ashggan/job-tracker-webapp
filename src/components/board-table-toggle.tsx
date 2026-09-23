"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "cn";

// Board and Table are both rendered from the same /table route now -- the
// toggle switches ?view=board on/off rather than navigating to a separate
// page. Table's own filter params are preserved when switching back to
// table view; board view doesn't have filters of its own yet, so its link
// is just ?view=board with nothing else carried over.
export function BoardTableToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isBoard = searchParams.get("view") === "board";

  const tableParams = new URLSearchParams(searchParams.toString());
  tableParams.delete("view");
  const tableQs = tableParams.toString();
  const tableHref = tableQs ? `${pathname}?${tableQs}` : pathname;
  const boardHref = `${pathname}?view=board`;

  return (
    <div className="inline-flex rounded-full bg-secondary p-0.75">
      <Link
        href={boardHref}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px]",
          isBoard ? "bg-card font-semibold shadow-[var(--shadow-sm)]" : "text-muted-foreground"
        )}
      >
        <LayoutGrid className="size-3.5" />
        Board
      </Link>
      <Link
        href={tableHref}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px]",
          !isBoard ? "bg-card font-semibold shadow-[var(--shadow-sm)]" : "text-muted-foreground"
        )}
      >
        <Table2 className="size-3.5" />
        Table
      </Link>
    </div>
  );
}
