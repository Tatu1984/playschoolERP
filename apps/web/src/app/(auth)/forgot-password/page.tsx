import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/frontend/components/features/auth/ForgotPasswordForm";

export const metadata = { title: "Reset your password — Climb Kiddo" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-2 font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-red">
          Climb Kiddo
        </Link>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We&apos;ll email you a link to set a new one</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
