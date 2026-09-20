"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageSelect } from "@/components/stage-select";
import type { Stage } from "@prisma/client";
import { EditForm } from "./edit-form";

export function HeaderSection({
  applicationId,
  jobTitle,
  company,
  location,
  postingUrl,
  deadline,
  stage,
  dateApplied,
}: {
  applicationId: string;
  jobTitle: string;
  company: string;
  location: string;
  postingUrl: string;
  deadline: string;
  stage: Stage;
  dateApplied: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const metaLine = [company, location || null, dateApplied ? `Applied ${dateApplied}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/table"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to table
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl">{jobTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{metaLine}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <StageSelect applicationId={applicationId} stage={stage} />
            <Button variant="outline" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
              Edit
            </Button>
          </div>
        </div>
      </div>

      {editing && (
        <EditForm
          applicationId={applicationId}
          jobTitle={jobTitle}
          company={company}
          postingUrl={postingUrl}
          location={location}
          deadline={deadline}
        />
      )}
    </div>
  );
}
