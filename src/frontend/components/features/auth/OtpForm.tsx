"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LENGTH = 6;
/** Demo code. The real flow verifies against an OTP issued by the SMS provider. */
const DEMO_CODE = "123456";

/** SoW §7.1 `POST /api/auth/verify-otp` — phone verification for parent signup. */
export function OtpForm({ phone = "+91 98300 •••23" }: { phone?: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[index] = clean;
      return next;
    });
    setError(null);
    if (clean && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? ""));
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < LENGTH) {
      setError("Enter all six digits");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    if (code === DEMO_CODE) {
      toast.success("Phone verified!");
      router.push("/parent");
    } else {
      setError("That code doesn't match. Try again.");
      setDigits(Array(LENGTH).fill(""));
      inputs.current[0]?.focus();
    }
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-ck-green" />
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a 6-digit code to <strong>{phone}</strong>
        </p>
      </div>

      <div className="flex justify-center gap-2" onPaste={onPaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={digit}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            className={cn(
              "h-14 w-11 rounded-xl border-2 text-center font-heading text-2xl font-bold outline-none transition",
              error ? "border-destructive" : digit ? "border-ck-green bg-ck-green/5" : "border-input",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
            )}
          />
        ))}
      </div>

      {error && <p className="text-center text-sm font-medium text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Verifying…" : "Verify phone"}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        {seconds > 0 ? (
          <span>Resend code in {seconds}s</span>
        ) : (
          <button
            type="button"
            className="font-medium text-ck-red hover:underline"
            onClick={() => {
              setSeconds(30);
              toast.success("New code sent");
            }}
          >
            Resend code
          </button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Demo code: <code className="rounded bg-muted px-1">123456</code> ·{" "}
        <Link href="/login" className="underline">
          back to sign in
        </Link>
      </p>
    </form>
  );
}
