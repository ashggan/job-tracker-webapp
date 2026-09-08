"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "cn";

export function BoardTableToggle() {
  const pathname = usePathname();
  const isBoard = pathname.startsWith("/board");

  return (
    <div className="inline-flex rounded-full bg-secondary p-0.75">
      <Link
        href="/board"
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px]",
          isBoard ? "bg-card font-semibold shadow-[var(--shadow-sm)]" : "text-muted-foreground"
        )}
      >
        <LayoutGrid className="size-3.5" />
        Board
      </Link>
      <Link
        href="/table"
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
