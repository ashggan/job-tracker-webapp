"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "cn";

export type BoardTableView = "board" | "table";

// Board and Table are two components rendered by the same page now -- the
// toggle just flips which one is showing, entirely client-side. No route
// change, so it doesn't round-trip through the server (or proxy.ts) at all.
export function BoardTableToggle({
  view,
  onChange,
}: {
  view: BoardTableView;
  onChange: (view: BoardTableView) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-secondary p-0.75">
      <button
        type="button"
        onClick={() => onChange("board")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px]",
          view === "board" ? "bg-card font-semibold shadow-[var(--shadow-sm)]" : "text-muted-foreground"
        )}
      >
        <LayoutGrid className="size-3.5" />
        Board
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px]",
          view === "table" ? "bg-card font-semibold shadow-[var(--shadow-sm)]" : "text-muted-foreground"
        )}
      >
        <Table2 className="size-3.5" />
        Table
      </button>
    </div>
  );
}
