import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { cctvService } from "@/backend/services/cctv.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveCameraPlayer } from "@/frontend/components/features/parent/LiveCameraPlayer";

export const metadata = { title: "Live Cameras — Climb Kiddo" };
export const dynamic = "force-dynamic";

export default async function ParentCctvPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/parent/cctv");

  const cameras = await cctvService.listForParent(session.sub);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-neutral-900">
          Live Cameras
        </h1>
        <p className="text-sm text-neutral-500">
          You can watch the cameras in your child&apos;s classroom during school hours.
          Streams are private to you and every view is logged for safety.
        </p>
      </div>

      {cameras.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            No cameras are available to you yet. The school assigns cameras to your
            child&apos;s classroom — please check back, or contact the office.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {cameras.map((cam) => (
            <Card key={cam.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{cam.name}</CardTitle>
                  <p className="text-xs text-neutral-500">
                    {cam.classroomName ?? "—"} · {cam.branchName}
                  </p>
                </div>
                <Badge variant={cam.liveNow ? "default" : "secondary"}>
                  {cam.liveNow ? "Live now" : "Offline"}
                </Badge>
              </CardHeader>
              <CardContent>
                <LiveCameraPlayer cameraId={cam.id} liveNow={cam.liveNow} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
