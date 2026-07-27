import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OtpForm } from "@/frontend/components/features/auth/OtpForm";

export const metadata = { title: "Verify your phone — Climb Kiddo" };

export default function VerifyOtpPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-2 font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-red">
          Climb Kiddo
        </Link>
        <CardTitle>Verify your phone</CardTitle>
        <CardDescription>One last step before we open your portal</CardDescription>
      </CardHeader>
      <CardContent>
        <OtpForm />
      </CardContent>
    </Card>
  );
}
