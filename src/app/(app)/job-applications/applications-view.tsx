"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
        <form action="/applications/new" className="flex items-center gap-3 border-b border-border px-7 py-4">
          <Input
            name="url"
            placeholder="Paste a job URL or add manually"
            title="Prefills the posting link on the add-job form"
            className="max-w-70"
          />
          <Button type="submit">
            <Plus />
            Add job
          </Button>
          <div className="flex-1" />
          <BoardTableToggle view={view} onChange={setView} />
        </form>
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
