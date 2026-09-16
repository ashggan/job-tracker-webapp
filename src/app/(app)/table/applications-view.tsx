"use client";

import { useState, type ReactNode } from "react";
import { BoardTableToggle, type BoardTableView } from "@/components/board-table-toggle";
import { TableFilters } from "./table-filters";

// Board and Table are two pre-rendered (server) subtrees handed down as
// props -- this component just decides which one is visible. Switching
// between them is local state, not navigation, so it never touches the
// server (or proxy.ts) at all.
export function ApplicationsView({
  defaultView,
  board,
  table,
}: {
  defaultView: BoardTableView;
  board: ReactNode;
  table: ReactNode;
}) {
  const [view, setView] = useState<BoardTableView>(defaultView);

  if (view === "board") {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-end border-b border-border px-7 py-4">
          <BoardTableToggle view={view} onChange={setView} />
        </div>
        {board}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TableFilters view={view} onViewChange={setView} />
      {table}
    </div>
  );
}
