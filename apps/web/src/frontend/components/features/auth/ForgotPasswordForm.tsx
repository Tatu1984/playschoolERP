"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** SoW §7.1 `POST /api/auth/forgot-password`. The endpoint lands in phase 2. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-ck-green" />
        <div>
          <p className="font-heading text-lg font-bold">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset link. It expires in 30 minutes.
          </p>
        </div>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
          <Button asChild className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Nothing arrived? Check spam, or call the school office on +91 98300 11223.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Registered email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use the email the school has on file for you. We&apos;ll never say whether an account exists.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href="/login">
          <ArrowLeft /> Back to sign in
        </Link>
      </Button>
    </form>
  );
}
