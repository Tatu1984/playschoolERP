import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { cctvService } from "@/backend/services/cctv.service";
import { prisma } from "@/backend/database/client";
import { isStaff } from "@/backend/utils/rbac.util";
import { CameraManager } from "@/frontend/components/features/admin/CameraManager";

export const metadata = { title: "Cameras — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCamerasPage() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) redirect("/login?next=/admin/cameras");

  const [cameras, branches] = await Promise.all([
    cctvService.listCameras(session.role),
    prisma.branch.findMany({
      include: { classrooms: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const branchOptions = branches.map((b) => ({
    id: b.id,
    name: b.name,
    classrooms: b.classrooms.map((c) => ({ id: c.id, name: c.name })),
  }));

  const cameraRows = cameras.map((c) => ({
    id: c.id,
    name: c.name,
    streamPath: c.streamPath,
    enabled: c.enabled,
    parentViewable: c.parentViewable,
    classroomName: c.classroom?.name ?? null,
    branchName: c.branch.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold">Cameras</h1>
        <p className="text-sm text-slate-500">
          Map cameras to classrooms and control who can watch. Use the enable
          toggle as a live kill-switch.
        </p>
      </div>
      <CameraManager branches={branchOptions} cameras={cameraRows} />
    </div>
  );
}
