"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateAccountAction, changePasswordAction } from "@/lib/actions/settings";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AccountSection({ name, email }: { name: string; email: string }) {
  const [accountState, accountAction] = useActionState(updateAccountAction, undefined);
  const [passwordState, passwordAction] = useActionState(changePasswordAction, undefined);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  return (
    <section>
      <h3 className="mb-3 text-xl">Account</h3>
      <form action={accountAction} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="name" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Name
            </Label>
            <Input id="name" name="name" defaultValue={name} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Email
            </Label>
            <Input id="email" name="email" type="email" defaultValue={email} />
          </div>
        </div>
        {accountState?.error && (
          <p className="text-[13px] text-destructive" role="alert">
            {accountState.error}
          </p>
        )}
        {accountState?.success && <p className="text-[13px] text-muted-foreground">{accountState.success}</p>}
        <div>
          <SubmitButton label="Save" pendingLabel="Saving…" />
        </div>
      </form>

      <button
        type="button"
        onClick={() => setShowPasswordForm((v) => !v)}
        className="mt-2.5 text-[13px] font-semibold text-accent-foreground hover:underline"
      >
        Change password
      </button>

      {showPasswordForm && (
        <form action={passwordAction} className="mt-3 flex flex-col gap-3 rounded-lg border border-border p-3.5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="currentPassword"
              className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
            >
              Current password
            </Label>
            <Input id="currentPassword" name="currentPassword" type="password" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              New password
            </Label>
            <Input id="newPassword" name="newPassword" type="password" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
            >
              Confirm new password
            </Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
          </div>
          {passwordState?.error && (
            <p className="text-[13px] text-destructive" role="alert">
              {passwordState.error}
            </p>
          )}
          {passwordState?.success && <p className="text-[13px] text-muted-foreground">{passwordState.success}</p>}
          <div>
            <SubmitButton label="Update password" pendingLabel="Updating…" />
          </div>
        </form>
      )}
    </section>
  );
}
