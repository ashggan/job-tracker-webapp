import { Plus, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BoardTableToggle } from "@/components/board-table-toggle";

const STAGES = ["Wishlist", "Applied", "Under Review", "Interview", "Offer", "Rejected", "Withdrawn"];

export default function BoardPage() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-border px-7 py-4">
        <Input
          placeholder="Paste a job URL or add manually"
          disabled
          title="Quick-add ships in Milestone 2"
          className="max-w-70"
        />
        <Button disabled title="Quick-add ships in Milestone 2">
          <Plus />
          Add job
        </Button>
        <div className="flex-1" />
        <BoardTableToggle />
        <Button variant="outline" disabled title="Filters ship in Milestone 2">
          <SlidersHorizontal />
          Filters
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-7 py-5.5">
        {STAGES.map((stage) => (
          <div key={stage} className="w-52 flex-none">
            <div className="mb-3 flex items-baseline gap-2 pb-2.5">
              <h4 className="text-sm font-semibold">{stage}</h4>
              <span className="text-xs text-muted-foreground">0</span>
            </div>
            <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              No jobs yet
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
