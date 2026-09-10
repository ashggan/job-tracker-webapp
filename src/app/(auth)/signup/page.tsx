"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signupAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signupAction, undefined);

  return (
    <div className="w-full max-w-[400px] rounded-xl bg-card p-6 shadow-[var(--shadow-md)]">
      <div className="mb-4.5 font-heading text-lg font-bold text-accent-foreground">
        JOTA
      </div>
      <h2 className="text-[26px]">Create your account</h2>
      <p className="mb-5.5 text-[13px] text-muted-foreground">
        Set up your resume and preferences once you&apos;re in.
      </p>

      <form action={formAction} className="flex flex-col">
        <Label htmlFor="name" className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Name
        </Label>
        <Input id="name" name="name" type="text" placeholder="Jamie Marsh" required className="mb-3.5" />

        <Label htmlFor="email" className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Email
        </Label>
        <Input id="email" name="email" type="email" placeholder="you@email.com" required className="mb-3.5" />

        <Label htmlFor="password" className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Password
        </Label>
        <Input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} className="mb-4.5" />

        {state?.error && (
          <p className="mb-3.5 text-[13px] text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <Separator className="my-4.5" />

      <div className="text-[13px]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent-foreground hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
