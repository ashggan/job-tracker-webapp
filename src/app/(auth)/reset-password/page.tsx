"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="w-full max-w-[400px] rounded-xl bg-card p-6 shadow-[var(--shadow-md)]">
      <div className="mb-4.5 font-heading text-lg font-bold text-accent-foreground">
        Waypoint
      </div>
      <h2 className="text-[26px]">Reset your password</h2>
      <p className="mb-5.5 text-[13px] text-muted-foreground">
        We&apos;ll send a reset link to your email.
      </p>

      {submitted ? (
        <p className="rounded-sm bg-secondary px-3.5 py-3 text-[13px] text-secondary-foreground">
          Password reset isn&apos;t wired up to an email provider yet — this ships once
          transactional email is configured. For now, contact whoever set up your account.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="flex flex-col"
        >
          <Label htmlFor="email" className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Email
          </Label>
          <Input id="email" name="email" type="email" placeholder="you@email.com" required className="mb-4.5" />
          <Button type="submit" size="lg" className="w-full justify-center">
            Send reset link
          </Button>
        </form>
      )}

      <div className="mt-4.5 text-[13px]">
        <Link href="/login" className="font-semibold text-accent-foreground hover:underline">
          Back to log in
        </Link>
      </div>
    </div>
  );
}
