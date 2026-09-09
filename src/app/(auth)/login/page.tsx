"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
      {pending ? "Logging in…" : "Log in"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <div className="w-full max-w-[400px] rounded-xl bg-card p-6 shadow-[var(--shadow-md)]">
      <div className="mb-4.5 font-heading text-lg font-bold text-accent-foreground">
        JOTA
      </div>
      <h2 className="text-[26px]">Welcome back</h2>
      <p className="mb-5.5 text-[13px] text-muted-foreground">
        Track every application in one place.
      </p>

      <form action={formAction} className="flex flex-col">
        <Label htmlFor="email" className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Email
        </Label>
        <Input id="email" name="email" type="email" placeholder="you@email.com" required className="mb-3.5" />

        <Label htmlFor="password" className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Password
        </Label>
        <Input id="password" name="password" type="password" placeholder="••••••••••" required className="mb-2" />

        <Link href="/reset-password" className="mb-4.5 text-xs text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>

        {state?.error && (
          <p className="mb-3.5 text-[13px] text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <Separator className="my-4.5" />

      <div className="text-[13px]">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-accent-foreground hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
