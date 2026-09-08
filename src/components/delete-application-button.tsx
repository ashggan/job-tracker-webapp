"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteApplicationAction } from "@/lib/actions/applications";

export function DeleteApplicationButton({
  applicationId,
  jobTitle,
}: {
  applicationId: string;
  jobTitle: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      title="Delete"
      aria-label={`Delete ${jobTitle}`}
      onClick={() => {
        if (!window.confirm(`Delete "${jobTitle}"? This can't be undone.`)) return;
        startTransition(() => {
          deleteApplicationAction(applicationId);
        });
      }}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
