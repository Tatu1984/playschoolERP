import Link from "next/link";
import { getSession } from "@/backend/services/auth.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Parent Dashboard — Climb Kiddo" };

export default async function ParentDashboard() {
  const session = await getSession();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-neutral-900">
          Hi {session?.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-sm text-neutral-500">Welcome to your parent portal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/parent/cctv">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">🎥 Live Cameras</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-500">
              Watch your child&apos;s classroom live during school hours.
            </CardContent>
          </Card>
        </Link>

        {/* Placeholders for upcoming ERP modules (Phase 3+). */}
        {[
          ["📸 Daily Feed", "Photos & updates from your child's day"],
          ["🗓️ Attendance", "Check-in / check-out & pickup logs"],
          ["📢 Notices", "Circulars and announcements"],
          ["💳 Fees", "Invoices, receipts & online payment"],
          ["📈 Progress", "Milestones & development reports"],
        ].map(([title, desc]) => (
          <Card key={title} className="h-full opacity-60">
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-500">
              {desc}
              <span className="mt-1 block text-xs font-medium text-neutral-400">Coming soon</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
