"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function CameraManager({
  branches,
  cameras,
}: {
  branches: BranchOption[];
  cameras: CameraRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    branchId: branches[0]?.id ?? "",
    classroomId: "",
    streamPath: "",
    rtspUrl: "",
    parentViewable: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const classrooms = useMemo(
    () => branches.find((b) => b.id === form.branchId)?.classrooms ?? [],
    [branches, form.branchId],
  );

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function addCamera(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/cctv/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          branchId: form.branchId,
          classroomId: form.classroomId || undefined,
          streamPath: form.streamPath,
          rtspUrl: form.rtspUrl,
          parentViewable: form.parentViewable,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add camera");
      setForm((f) => ({ ...f, name: "", streamPath: "", rtspUrl: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add camera");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(cam: CameraRow) {
    setBusyId(cam.id);
    try {
      await fetch(`/api/cctv/cameras/${cam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !cam.enabled }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a camera</CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Create a branch &amp; classroom first (seed the database).
            </p>
          ) : (
            <form onSubmit={addCamera} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Toddler Room — Front" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch</Label>
                <select id="branch" className="h-9 w-full rounded-md border px-3 text-sm" value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classroom">Classroom</Label>
                <select id="classroom" className="h-9 w-full rounded-md border px-3 text-sm" value={form.classroomId} onChange={(e) => set("classroomId", e.target.value)}>
                  <option value="">— none —</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="streamPath">Stream path</Label>
                <Input id="streamPath" required value={form.streamPath} onChange={(e) => set("streamPath", e.target.value)} placeholder="classroom-a" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rtspUrl">Source RTSP URL</Label>
                <Input id="rtspUrl" required value={form.rtspUrl} onChange={(e) => set("rtspUrl", e.target.value)} placeholder="rtsp://user:pass@nvr-ip:554/Streaming/Channels/101" />
                <p className="text-xs text-neutral-400">Stored server-side only — never sent to parents.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.parentViewable} onChange={(e) => set("parentViewable", e.target.checked)} />
                Visible to parents
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Adding…" : "Add camera"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cameras ({cameras.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {cameras.length === 0 ? (
            <p className="text-sm text-neutral-500">No cameras yet.</p>
          ) : (
            <div className="divide-y">
              {cameras.map((cam) => (
                <div key={cam.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cam.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {cam.classroomName ?? "—"} · {cam.branchName} · <code>{cam.streamPath}</code>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!cam.parentViewable && <Badge variant="secondary">staff-only</Badge>}
                    <Badge variant={cam.enabled ? "default" : "destructive"}>
                      {cam.enabled ? "On" : "Off"}
                    </Badge>
                    <Button size="sm" variant="outline" disabled={busyId === cam.id} onClick={() => toggle(cam)}>
                      {cam.enabled ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
