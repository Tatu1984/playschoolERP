import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/brand/Logo";
import { Aurora } from "@/components/reactbits/Aurora";

export const metadata: Metadata = {
  title: "Sign in · GMS · Climb Kiddo",
  robots: { index: false, follow: false },
};

export default async function GmsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="relative isolate min-h-screen flex items-center justify-center px-4">
      <Aurora className="opacity-40" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size={56} withWordmark />
        </div>
        <LoginForm next={sp?.next} />
      </div>
    </div>
  );
}
