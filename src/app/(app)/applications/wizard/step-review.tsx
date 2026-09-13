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

export function StepReview({
  extracted,
  onBack,
  onContinue,
}: {
  extracted: ExtractedPosting;
  onBack: () => void;
  onContinue: (reviewed: ExtractedPosting) => void;
}) {
  const [jobTitle, setJobTitle] = useState(extracted.jobTitle);
  const [company, setCompany] = useState(extracted.company);
  const [description, setDescription] = useState(extracted.description);
  const [requirements, setRequirements] = useState(extracted.requirements.join("\n"));
  const [niceToHaves, setNiceToHaves] = useState(extracted.niceToHaves.join("\n"));
  const [deadline, setDeadline] = useState(extracted.deadline ?? "");

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
            onContinue({
              ...extracted,
              jobTitle,
              company,
              description,
              requirements: requirements.split("\n").map((r) => r.trim()).filter(Boolean),
              niceToHaves: niceToHaves.split("\n").map((n) => n.trim()).filter(Boolean),
              deadline: deadline.trim() || null,
            })
          }
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
