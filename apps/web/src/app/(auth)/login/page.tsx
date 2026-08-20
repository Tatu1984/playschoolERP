import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/frontend/components/features/auth/LoginForm";

export const metadata = { title: "Sign in — Climb Kiddo" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-2 font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#e63946]">
          Climb Kiddo
        </Link>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to the parent portal</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
