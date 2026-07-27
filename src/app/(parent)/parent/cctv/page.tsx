import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/backend/services/auth.service";
import { cctvService } from "@/backend/services/cctv.service";
import { Badge } from "@/components/ui/badge";
import { LiveCameraPlayer } from "@/frontend/components/features/parent/LiveCameraPlayer";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { EmptyState } from "@/frontend/components/ui/EmptyState";

export const metadata = { title: "Live Cameras — Climb Kiddo" };
export const dynamic = "force-dynamic";

interface CameraCard {
  id: string;
  name: string;
  classroomName: string | null;
  branchName: string;
  liveNow: boolean;
}

export default async function ParentCctvPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/parent/cctv");

  let cameras: CameraCard[] = [];
  let dbUp = true;
  try {
    cameras = await cctvService.listForParent(session.sub);
  } catch {
    dbUp = false;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live cameras"
        description="Watch your child's classroom during school hours. Streams are private to you, nothing is recorded, and every view is logged for safety."
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Live camera" }]}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ck-green/30 bg-ck-green/5 p-3 text-xs">
        <ShieldCheck className="h-4 w-4 shrink-0 text-ck-green" />
        <span>
          Live only · your child&apos;s classroom only · school hours only · no recordings kept. Camera credentials never
          leave the server.
        </span>
      </div>

      {!dbUp ? (
        <EmptyState
          emoji="🔌"
          title="Camera service unreachable"
          description="The live-video module reads from the school database. Please try again in a moment or contact the office."
        />
      ) : cameras.length === 0 ? (
        <EmptyState
          emoji="🎥"
          title="No cameras available yet"
          description="The school assigns cameras to your child's classroom. Check back later or contact the office."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cameras.map((cam) => (
            <SectionCard
              key={cam.id}
              title={cam.name}
              description={`${cam.classroomName ?? "—"} · ${cam.branchName}`}
              action={
                <Badge variant={cam.liveNow ? "default" : "secondary"}>{cam.liveNow ? "🔴 Live now" : "Offline"}</Badge>
              }
            >
              <LiveCameraPlayer cameraId={cam.id} liveNow={cam.liveNow} />
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
