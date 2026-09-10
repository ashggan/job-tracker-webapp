"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { updateResumeStructuredAction } from "@/lib/actions/profile";
import type { ResumeStructured } from "@/lib/profile";

let rowId = 0;
function nextId() {
  rowId += 1;
  return rowId;
}

const EMPTY_EXPERIENCE = { title: "", company: "", location: "", startDate: "", endDate: "", bullets: [] as string[] };
const EMPTY_EDUCATION = { school: "", degree: "", field: "", startDate: "", endDate: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save resume details"}
    </Button>
  );
}

function FieldRow({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}

export function ResumeStructuredForm({ initial }: { initial: ResumeStructured }) {
  const [state, formAction] = useActionState(updateResumeStructuredAction, undefined);
  const [experience, setExperience] = useState(() =>
    (initial.experience.length ? initial.experience : [EMPTY_EXPERIENCE]).map((row) => ({
      id: nextId(),
      ...row,
    }))
  );
  const [education, setEducation] = useState(() =>
    (initial.education.length ? initial.education : [EMPTY_EDUCATION]).map((row) => ({
      id: nextId(),
      ...row,
    }))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume details</CardTitle>
        <CardDescription>
          Structured breakdown Claude will use as scoring/tailoring input, once those ship.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
          <input type="hidden" name="experienceCount" value={experience.length} />
          <input type="hidden" name="educationCount" value={education.length} />

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Name" name="contactName" defaultValue={initial.contact.name} />
            <FieldRow label="Email" name="contactEmail" defaultValue={initial.contact.email} />
            <FieldRow label="Phone" name="contactPhone" defaultValue={initial.contact.phone} />
            <FieldRow label="Location" name="contactLocation" defaultValue={initial.contact.location} />
          </div>
          <FieldRow
            label="Links (portfolio, LinkedIn, etc.)"
            name="contactLinks"
            defaultValue={initial.contact.links}
          />

          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Summary
            </Label>
            <Textarea name="summary" rows={3} defaultValue={initial.summary} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Skills (comma-separated)
            </Label>
            <Input name="skills" defaultValue={initial.skills.join(", ")} placeholder="TypeScript, Figma, SQL" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Experience
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setExperience((rows) => [...rows, { id: nextId(), ...EMPTY_EXPERIENCE }])}
              >
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            {experience.map((row, i) => (
              <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border p-3.5">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Input name={`experience.${i}.title`} placeholder="Title" defaultValue={row.title} />
                  <Input name={`experience.${i}.company`} placeholder="Company" defaultValue={row.company} />
                  <Input name={`experience.${i}.location`} placeholder="Location" defaultValue={row.location} />
                  <div className="flex gap-2">
                    <Input name={`experience.${i}.startDate`} placeholder="Start" defaultValue={row.startDate} />
                    <Input name={`experience.${i}.endDate`} placeholder="End / Present" defaultValue={row.endDate} />
                  </div>
                  <Textarea
                    name={`experience.${i}.bullets`}
                    rows={3}
                    placeholder="One bullet per line"
                    defaultValue={row.bullets.join("\n")}
                    className="col-span-2"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove experience entry"
                  onClick={() => setExperience((rows) => rows.filter((r) => r.id !== row.id))}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Education
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setEducation((rows) => [...rows, { id: nextId(), ...EMPTY_EDUCATION }])}
              >
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            {education.map((row, i) => (
              <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border p-3.5">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Input name={`education.${i}.school`} placeholder="School" defaultValue={row.school} />
                  <Input name={`education.${i}.degree`} placeholder="Degree" defaultValue={row.degree} />
                  <Input name={`education.${i}.field`} placeholder="Field of study" defaultValue={row.field} />
                  <div className="flex gap-2">
                    <Input name={`education.${i}.startDate`} placeholder="Start" defaultValue={row.startDate} />
                    <Input name={`education.${i}.endDate`} placeholder="End" defaultValue={row.endDate} />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove education entry"
                  onClick={() => setEducation((rows) => rows.filter((r) => r.id !== row.id))}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {state?.error && (
            <p className="text-[13px] text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
