import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/frontend/components/features/auth/ResetPasswordForm";

export const metadata = {
  title: "Set a new password — Climb Kiddo",
  // The token is in the query string; nothing about this page should ever be
  // indexed or previewed by anything that follows links.
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-2 font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-red">
          Climb Kiddo
        </Link>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose something you have not used here before</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
