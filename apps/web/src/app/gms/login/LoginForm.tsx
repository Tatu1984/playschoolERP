"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight } from "lucide-react";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/gms/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Wrong password");
      return;
    }
    router.push(next && next.startsWith("/gms") ? next : "/gms");
    router.refresh();
  }

  return (
    <Card className="rounded-3xl border-0 bg-white shadow-[0_20px_50px_rgba(26,31,75,0.12)]">
      <CardContent className="p-8 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ck-red text-white shadow-md">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <p className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
              Gallery Management
            </p>
            <p className="text-sm text-ck-navy/60">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="pwd" className="font-bold">
              Admin password
            </Label>
            <Input
              id="pwd"
              type="password"
              autoFocus
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 rounded-xl bg-ck-cream/40 border-ck-cream focus-visible:ring-ck-red"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-ck-red/10 px-3 py-2 text-sm font-semibold text-ck-red">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ck-red hover:bg-ck-red/90 py-6 text-base font-bold disabled:opacity-50"
          >
            {loading ? "Signing in…" : (
              <>
                Sign in <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-ck-navy/50">
          Reach the admin to recover access.
        </p>
      </CardContent>
    </Card>
  );
}
