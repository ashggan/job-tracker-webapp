"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ExtractedPosting } from "@/lib/ai/extract-posting";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// Used to seed the Deadline field when the posting didn't state one, so it's
// never silently blank -- still fully editable/clearable afterward.
function defaultDeadline(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function StepReview({
  extracted,
  postingUrl,
  onBack,
  onContinue,
}: {
  extracted: ExtractedPosting;
  postingUrl?: string;
  onBack: () => void;
  onContinue: (reviewed: ExtractedPosting, postingUrl: string | undefined) => void;
}) {
  const [jobTitle, setJobTitle] = useState(extracted.jobTitle);
  const [company, setCompany] = useState(extracted.company);
  const [description, setDescription] = useState(extracted.description);
  const [requirements, setRequirements] = useState(extracted.requirements.join("\n"));
  const [niceToHaves, setNiceToHaves] = useState(extracted.niceToHaves.join("\n"));
  const [keywords, setKeywords] = useState(extracted.keywords.join("\n"));
  const [location, setLocation] = useState(extracted.location ?? "");
  const [deadline, setDeadline] = useState(extracted.deadline?.trim() || defaultDeadline());
  const [url, setUrl] = useState(postingUrl ?? "");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted-foreground">
        Double-check what we pulled from the posting before continuing.
      </p>

      <Field label="Job title">
        <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
      </Field>

      <Field label="Company">
        <Input value={company} onChange={(e) => setCompany(e.target.value)} required />
      </Field>

      <Field label="Description">
        <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Field label="Requirements (one per line)">
        <Textarea rows={5} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
      </Field>

      <Field label="Nice to have (one per line)">
        <Textarea rows={3} value={niceToHaves} onChange={(e) => setNiceToHaves(e.target.value)} />
      </Field>

      <Field label="Keywords (one per line)">
        <Textarea rows={3} value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </Field>

      <Field label="Location">
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote, Toronto, etc." />
      </Field>

      <Field label="Posting link (optional)">
        <Input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Field label="Deadline (YYYY-MM-DD, leave blank if none)">
        <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="2026-12-15" />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={() =>
            onContinue(
              {
                ...extracted,
                jobTitle,
                company,
                description,
                requirements: requirements.split("\n").map((r) => r.trim()).filter(Boolean),
                niceToHaves: niceToHaves.split("\n").map((n) => n.trim()).filter(Boolean),
                keywords: keywords.split("\n").map((k) => k.trim()).filter(Boolean),
                location: location.trim() || null,
                deadline: deadline.trim() || null,
              },
              url.trim() || undefined
            )
          }
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
