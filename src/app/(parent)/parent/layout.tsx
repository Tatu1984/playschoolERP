import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { LogoutButton } from "@/frontend/components/features/auth/LogoutButton";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/parent");

  return (
    <div className="min-h-screen bg-[#fdf6ec]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/parent" className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-[#e63946]">
              Climb Kiddo
            </Link>
            <nav className="hidden gap-4 text-sm font-medium text-neutral-600 sm:flex">
              <Link href="/parent" className="hover:text-neutral-900">Dashboard</Link>
              <Link href="/parent/cctv" className="hover:text-neutral-900">Live Cameras</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-500 sm:inline">{session.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
