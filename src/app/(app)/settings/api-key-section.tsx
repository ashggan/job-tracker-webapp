"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addApiKeyAction, activateApiKeyAction, removeApiKeyAction } from "@/lib/actions/settings";
import { PROVIDER_LABELS, SUPPORTED_PROVIDERS } from "@/lib/ai/providers";
import type { UserApiKey } from "@prisma/client";

const PROVIDER_ITEMS: Record<string, React.ReactNode> = Object.fromEntries(
  SUPPORTED_PROVIDERS.map((p) => [p, PROVIDER_LABELS[p]])
);

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Validating…" : "Add key"}
    </Button>
  );
}

export function ApiKeySection({ apiKeys }: { apiKeys: UserApiKey[] }) {
  const [addState, addAction] = useActionState(addApiKeyAction, undefined);
  const [showAddForm, setShowAddForm] = useState(apiKeys.length === 0);
  const [isPending, startTransition] = useTransition();

  return (
    <section>
      <h3 className="mb-1 text-xl">AI provider</h3>
      <p className="mb-3 text-[13px] text-muted-foreground">
        JOTA doesn&apos;t provide a shared AI key — add your own to enable scoring, tailoring,
        and extraction. Claude, OpenAI, and Google are supported.
      </p>

      {apiKeys.length === 0 && !showAddForm && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-accent/40 bg-accent/5 p-3.5">
          <KeyRound className="size-4 text-accent-foreground" />
          <div className="flex-1">
            <div className="text-sm font-bold">No API key added yet</div>
            <div className="text-xs text-muted-foreground">
              AI features are unavailable until you add one
            </div>
          </div>
        </div>
      )}

      {apiKeys.map((key) => (
        <div key={key.id} className="mb-3 rounded-xl border border-border p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">
                {PROVIDER_LABELS[key.provider as keyof typeof PROVIDER_LABELS] ?? key.provider} —{" "}
                {key.keyPreview}
              </div>
              <div className="text-xs text-muted-foreground">
                Added{" "}
                {key.createdAt.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {key.isActive ? (
                <Badge variant="secondary" className="bg-accent/20 font-bold text-accent-foreground">
                  Active
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={isPending}
                  onClick={() => startTransition(() => activateApiKeyAction(key.id))}
                >
                  Activate
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={isPending}
                onClick={() => startTransition(() => removeApiKeyAction(key.id))}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ))}

      {showAddForm ? (
        <form action={addAction} className="flex flex-col gap-2.5 rounded-lg border border-border p-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Provider
            </Label>
            <Select name="provider" items={PROVIDER_ITEMS} defaultValue="anthropic">
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apiKey" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              API key
            </Label>
            <Input id="apiKey" name="apiKey" type="password" placeholder="sk-..." required />
          </div>
          <p className="text-xs text-muted-foreground">
            The key is validated with the provider before it&apos;s saved.
          </p>
          {addState?.error && (
            <p className="text-[13px] text-destructive" role="alert">
              {addState.error}
            </p>
          )}
          {addState?.success && <p className="text-[13px] text-muted-foreground">{addState.success}</p>}
          <div>
            <AddButton />
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="text-[13px] font-semibold text-accent-foreground hover:underline"
        >
          + Add another key
        </button>
      )}
    </section>
  );
}
