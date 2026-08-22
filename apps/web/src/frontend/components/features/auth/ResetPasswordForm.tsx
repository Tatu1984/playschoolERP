"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * SoW §7.1 `POST /api/auth/reset-password`.
 *
 * The token arrives in the URL. It is checked once on arrival so that a link
 * which expired yesterday says so before anyone types a password twice — but
 * that check is a courtesy, not a gate: the POST re-checks everything, and the
 * page never learns whose account the token belongs to.
 *
 * Nothing signs the visitor in on success. Somebody resetting a password may be
 * doing it precisely because another person has the account, and handing a
 * fresh session to whoever opened the link is the wrong end of that.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  // "no token in the URL" is known at first render, so it is the initial state
  // rather than something an effect corrects a render later.
  const [state, setState] = useState<"checking" | "ready" | "expired" | "done">(
    token ? "checking" : "expired",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: { valid?: boolean }) => {
        if (!cancelled) setState(data.valid ? "ready" : "expired");
      })
      // A network failure is not an expired link. Show the form and let the
      // submit produce the real answer.
      .catch(() => {
        if (!cancelled) setState("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not reset the password");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password");
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking") {
    return <p className="text-center text-sm text-muted-foreground">Checking your link…</p>;
  }

  if (state === "expired") {
    return (
      <div className="space-y-4 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-ck-red" />
        <div>
          <p className="font-heading text-lg font-bold">This link has expired</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reset links work once and last 30 minutes. Ask for a new one and it will arrive in a moment.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Send a new link</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Still stuck? Call the school office on +91 98300 11223.
        </p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-ck-green" />
        <div>
          <p className="font-heading text-lg font-bold">Password changed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Everywhere you were signed in has been signed out, on every device. Sign in again with your new password.
          </p>
        </div>
        <Button className="w-full" onClick={() => router.push("/login")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Repeat new password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Saving…" : "Set new password"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </form>
  );
}
