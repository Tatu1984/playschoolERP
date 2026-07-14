import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/frontend/components/features/auth/RegisterForm";

export const metadata = { title: "Create account — Climb Kiddo" };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-2 font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#e63946]">
          Climb Kiddo
        </Link>
        <CardTitle>Create your parent account</CardTitle>
        <CardDescription>Access daily updates, attendance & live classroom cameras</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
