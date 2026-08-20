import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { cctvService } from "@/backend/services/cctv.service";
import { prisma } from "@/backend/database/client";
import { isStaff } from "@/backend/utils/rbac.util";
import { env } from "@/config/env";
import { CameraWall, type BranchOption, type CameraCard } from "@/frontend/components/features/admin/CameraWall";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { EmptyState } from "@/frontend/components/ui/EmptyState";

export const metadata = { title: "Cameras — Climb Kiddo Admin" };
export const dynamic = "force-dynamic";

function clock(minutes: number): string {
  return `${`${Math.floor(minutes / 60)}`.padStart(2, "0")}:${`${minutes % 60}`.padStart(2, "0")}`;
}

/**
 * Unlike the rest of the admin surface, cameras are already wired to Postgres +
 * MediaMTX — so this page degrades gracefully rather than faking data.
 *
 * Note `rtspUrl` is deliberately dropped when mapping: camera credentials must
 * never cross into a client component, not even for an admin.
 */
async function loadCameras(
  role: Parameters<typeof cctvService.listCameras>[0],
): Promise<{ branches: BranchOption[]; cameras: CameraCard[] } | null> {
  try {
    const [cameras, branches, hours] = await Promise.all([
      cctvService.listCameras(role),
      prisma.branch.findMany({
        include: { classrooms: { orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
      }),
      prisma.schoolHours.findMany(),
    ]);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const minutesNow = now.getHours() * 60 + now.getMinutes();

    return {
      branches: branches.map((b) => {
        const today = hours.find((h) => h.branchId === b.id && h.dayOfWeek === dayOfWeek);
        return {
          id: b.id,
          name: b.name,
          classrooms: b.classrooms.map((c) => ({ id: c.id, name: c.name })),
          opensAt: today ? clock(today.openMin) : null,
          closesAt: today ? clock(today.closeMin) : null,
          openNow: !!today && minutesNow >= today.openMin && minutesNow <= today.closeMin,
        };
      }),
      cameras: cameras.map((c) => ({
        id: c.id,
        name: c.name,
        streamPath: c.streamPath,
        enabled: c.enabled,
        parentViewable: c.parentViewable,
        classroomId: c.classroom?.id ?? null,
        classroomName: c.classroom?.name ?? null,
        branchId: c.branchId,
        branchName: c.branch.name,
      })),
    };
  } catch {
    return null;
  }
}

export default async function AdminCamerasPage() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) redirect("/login?next=/admin/cameras");

  const data = await loadCameras(session.role);

  // A localhost WHEP endpoint means no browser outside the dev machine can reach
  // the media server — surface that instead of showing a player that never connects.
  const mediaConfigured = !/localhost|127\.0\.0\.1/.test(env.MEDIAMTX_WHEP_URL);

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Cameras"
          description="Map cameras to classrooms and control who can watch."
          crumbs={[{ label: "Admin", href: "/admin" }, { label: "Cameras" }]}
        />
        <EmptyState
          emoji="🔌"
          title="Camera database unreachable"
          description="The CCTV module reads live from Postgres. Check DATABASE_URL and reload."
        />
      </div>
    );
  }

  return <CameraWall cameras={data.cameras} branches={data.branches} mediaConfigured={mediaConfigured} />;
}
