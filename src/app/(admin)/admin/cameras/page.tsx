import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { cctvService } from "@/backend/services/cctv.service";
import { prisma } from "@/backend/database/client";
import { isStaff } from "@/backend/utils/rbac.util";
import { CameraManager } from "@/frontend/components/features/admin/CameraManager";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { EmptyState } from "@/frontend/components/ui/EmptyState";

export const metadata = { title: "Cameras — Climb Kiddo Admin" };
export const dynamic = "force-dynamic";

interface BranchOption {
  id: string;
  name: string;
  classrooms: { id: string; name: string }[];
}

interface CameraRow {
  id: string;
  name: string;
  streamPath: string;
  enabled: boolean;
  parentViewable: boolean;
  classroomName: string | null;
  branchName: string;
}

/**
 * Unlike the rest of the admin surface, cameras are already wired to Postgres +
 * MediaMTX — so this page degrades gracefully rather than faking data.
 */
async function loadCameras(
  role: Parameters<typeof cctvService.listCameras>[0],
): Promise<{ branches: BranchOption[]; cameras: CameraRow[] } | null> {
  try {
    const [cameras, branches] = await Promise.all([
      cctvService.listCameras(role),
      prisma.branch.findMany({
        include: { classrooms: { orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
      }),
    ]);
    return {
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        classrooms: b.classrooms.map((c) => ({ id: c.id, name: c.name })),
      })),
      cameras: cameras.map((c) => ({
        id: c.id,
        name: c.name,
        streamPath: c.streamPath,
        enabled: c.enabled,
        parentViewable: c.parentViewable,
        classroomName: c.classroom?.name ?? null,
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cameras"
        description="Map cameras to classrooms and control who can watch. The enable toggle is a live kill-switch."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Cameras" }]}
      />
      {data ? (
        <CameraManager branches={data.branches} cameras={data.cameras} />
      ) : (
        <EmptyState
          emoji="🔌"
          title="Camera database unreachable"
          description="The CCTV module reads live from Postgres. Start the database (brew services start postgresql@14) and reload."
        />
      )}
    </div>
  );
}
