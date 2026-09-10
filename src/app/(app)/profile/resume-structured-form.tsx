"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { updateResumeStructuredAction } from "@/lib/actions/profile";
import type { ResumeStructured } from "@/lib/profile";

const EMPTY_EXPERIENCE = { title: "", company: "", location: "", startDate: "", endDate: "", bullets: [] as string[] };
const EMPTY_EDUCATION = { school: "", degree: "", field: "", startDate: "", endDate: "" };

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
      id: crypto.randomUUID(),
      ...row,
    }))
  );
  const [education, setEducation] = useState(() =>
    (initial.education.length ? initial.education : [EMPTY_EDUCATION]).map((row) => ({
      id: crypto.randomUUID(),
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
                onClick={() =>
                  setExperience((rows) => [...rows, { id: crypto.randomUUID(), ...EMPTY_EXPERIENCE }])
                }
              >
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            {experience.map((row) => (
              <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border p-3.5">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Input name="experience.title" placeholder="Title" defaultValue={row.title} />
                  <Input name="experience.company" placeholder="Company" defaultValue={row.company} />
                  <Input name="experience.location" placeholder="Location" defaultValue={row.location} />
                  <div className="flex gap-2">
                    <Input name="experience.startDate" placeholder="Start" defaultValue={row.startDate} />
                    <Input name="experience.endDate" placeholder="End / Present" defaultValue={row.endDate} />
                  </div>
                  <Textarea
                    name="experience.bullets"
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
                onClick={() =>
                  setEducation((rows) => [...rows, { id: crypto.randomUUID(), ...EMPTY_EDUCATION }])
                }
              >
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            {education.map((row) => (
              <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border p-3.5">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Input name="education.school" placeholder="School" defaultValue={row.school} />
                  <Input name="education.degree" placeholder="Degree" defaultValue={row.degree} />
                  <Input name="education.field" placeholder="Field of study" defaultValue={row.field} />
                  <div className="flex gap-2">
                    <Input name="education.startDate" placeholder="Start" defaultValue={row.startDate} />
                    <Input name="education.endDate" placeholder="End" defaultValue={row.endDate} />
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
            <SubmitButton size="sm" pendingLabel="Saving…">
              Save resume details
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
