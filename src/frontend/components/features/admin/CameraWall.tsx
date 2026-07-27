"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Eye,
  Info,
  Moon,
  Plus,
  Power,
  Radio,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { SectionCard, InfoItem } from "@/frontend/components/ui/Bits";
import { DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { CheckboxField, SelectField, TextField } from "@/frontend/components/ui/Field";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { cn } from "@/lib/utils";

export interface CameraCard {
  id: string;
  name: string;
  streamPath: string;
  enabled: boolean;
  parentViewable: boolean;
  classroomId: string | null;
  classroomName: string | null;
  branchId: string;
  branchName: string;
}

export interface BranchOption {
  id: string;
  name: string;
  classrooms: { id: string; name: string }[];
  /** "HH:mm" window for today, derived from SchoolHours. */
  opensAt: string | null;
  closesAt: string | null;
  /** Whether now falls inside today's window. */
  openNow: boolean;
}

/** Why a tile cannot show a picture right now — drives the placeholder copy. */
type TileState = "disabled" | "closed" | "unmapped" | "no-media" | "ready";

function tileState(camera: CameraCard, branch: BranchOption | undefined, mediaConfigured: boolean): TileState {
  if (!camera.enabled) return "disabled";
  if (!camera.classroomId) return "unmapped";
  if (branch && !branch.openNow) return "closed";
  if (!mediaConfigured) return "no-media";
  return "ready";
}

const TILE_COPY: Record<TileState, { emoji: string; title: string; body: string }> = {
  disabled: {
    emoji: "🚫",
    title: "Switched off",
    body: "The kill-switch is off, so nobody — parent or staff — can open this feed.",
  },
  closed: {
    emoji: "🌙",
    title: "Outside school hours",
    body: "Live viewing is only permitted inside this branch's hours.",
  },
  unmapped: {
    emoji: "🏫",
    title: "Not mapped to a classroom",
    body: "Parents inherit access through their child's classroom. Map this camera to one.",
  },
  "no-media": {
    emoji: "📡",
    title: "Media server not reachable",
    body: "MEDIAMTX_WHEP_URL is not set for this deployment, so no stream can be negotiated.",
  },
  ready: {
    emoji: "🔴",
    title: "Live window open",
    body: "Parents of this classroom can watch right now.",
  },
};

/**
 * Admin camera view: what exists, who can see it, and why a feed is or isn't
 * watchable at this moment. Staff live preview needs a staff-scoped view token
 * (camera service, backend phase) — until then each tile explains its state
 * rather than pretending to play.
 */
export function CameraWall({
  cameras,
  branches,
  mediaConfigured,
}: {
  cameras: CameraCard[];
  branches: BranchOption[];
  mediaConfigured: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [viewing, setViewing] = useState<CameraCard | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    branchId: branches[0]?.id ?? "",
    classroomId: "",
    streamPath: "",
    rtspUrl: "",
    parentViewable: true,
  });

  const classroomsFor = (branchId: string) => branches.find((b) => b.id === branchId)?.classrooms ?? [];

  async function toggleEnabled(camera: CameraCard) {
    setBusyId(camera.id);
    try {
      const res = await fetch(`/api/cctv/cameras/${camera.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !camera.enabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not update the camera");
      toast.success(`${camera.name} ${camera.enabled ? "switched off" : "switched on"}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the camera");
    } finally {
      setBusyId(null);
    }
  }

  async function addCamera(): Promise<boolean> {
    if (!form.name.trim() || !form.streamPath.trim() || !form.rtspUrl.trim()) {
      toast.error("Name, stream path and RTSP URL are required");
      return false;
    }
    try {
      const res = await fetch("/api/cctv/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          branchId: form.branchId,
          classroomId: form.classroomId || undefined,
          streamPath: form.streamPath.trim(),
          rtspUrl: form.rtspUrl.trim(),
          parentViewable: form.parentViewable,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add the camera");
      toast.success(`${form.name.trim()} added`);
      setForm({ ...form, name: "", streamPath: "", rtspUrl: "", classroomId: "" });
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the camera");
      return false;
    }
  }

  function copy(value: string, what: string) {
    navigator.clipboard?.writeText(value);
    toast.success(`${what} copied`);
  }

  const liveWindows = branches.filter((b) => b.openNow).length;
  const watchable = cameras.filter(
    (c) => tileState(c, branches.find((b) => b.id === c.branchId), mediaConfigured) === "ready" && c.parentViewable,
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cameras"
        description="Every feed the school has, who can watch it, and why it is or isn't watchable right now."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Cameras" }]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/parent/cctv">
                <ExternalLink /> Parent view
              </Link>
            </Button>
            <Button onClick={() => setAddOpen(true)} disabled={branches.length === 0}>
              <Plus /> Add camera
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Cameras" value={cameras.length} accent="navy" icon={<Video className="h-4 w-4" />} />
        <KpiCard
          label="Switched on"
          value={cameras.filter((c) => c.enabled).length}
          accent={cameras.some((c) => c.enabled) ? "green" : "muted"}
          sub={`${cameras.filter((c) => !c.enabled).length} off`}
        />
        <KpiCard
          label="Watchable now"
          value={watchable}
          accent={watchable ? "brand" : "muted"}
          icon={<Radio className="h-4 w-4" />}
          sub={`${liveWindows} of ${branches.length} branches open`}
        />
        <KpiCard
          label="Staff-only"
          value={cameras.filter((c) => !c.parentViewable).length}
          accent="orange"
          sub="hidden from parents"
        />
      </div>

      {!mediaConfigured && (
        <div className="flex flex-wrap items-start gap-2 rounded-2xl border border-ck-orange/40 bg-ck-orange/5 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ck-orange" />
          <p className="min-w-0">
            <span className="font-semibold">No media server is configured for this deployment.</span>{" "}
            Cameras can be registered and mapped here, but no stream can be negotiated until MediaMTX is reachable over
            TLS and <code className="rounded bg-muted px-1">MEDIAMTX_WHEP_URL</code> /{" "}
            <code className="rounded bg-muted px-1">MEDIAMTX_HLS_URL</code> point at it.
          </p>
        </div>
      )}

      {/* school-hours strip */}
      {branches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <span
              key={b.id}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                b.openNow ? "border-ck-green/40 bg-ck-green/10 text-lime-700" : "bg-muted text-muted-foreground",
              )}
            >
              {b.openNow ? <Radio className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {b.name.replace("Climb Kiddo — ", "")}
              <span className="font-normal">
                {b.opensAt && b.closesAt ? `${b.opensAt}–${b.closesAt}` : "hours not set"}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* the wall */}
      {cameras.length === 0 ? (
        <EmptyState
          emoji="🎥"
          title="No cameras registered"
          description="Add a camera with its MediaMTX stream path, then map it to a classroom so those parents inherit access."
          action={
            <Button onClick={() => setAddOpen(true)} disabled={branches.length === 0}>
              <Plus /> Add the first camera
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cameras.map((camera) => {
            const branch = branches.find((b) => b.id === camera.branchId);
            const state = tileState(camera, branch, mediaConfigured);
            const copyText = TILE_COPY[state];
            return (
              <article key={camera.id} className="overflow-hidden rounded-2xl border bg-card">
                {/* preview tile */}
                <button
                  type="button"
                  onClick={() => setViewing(camera)}
                  className="group relative block aspect-video w-full bg-ck-navy text-left"
                  aria-label={`Open ${camera.name}`}
                >
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
                    <span className="text-3xl" aria-hidden>
                      {copyText.emoji}
                    </span>
                    <span className="text-sm font-semibold text-white">{copyText.title}</span>
                    <span className="text-[11px] leading-snug text-white/60">{copyText.body}</span>
                  </span>
                  <span className="absolute top-2 left-2 flex items-center gap-1.5">
                    {state === "ready" ? (
                      <span className="flex items-center gap-1 rounded-full bg-ck-red px-2 py-0.5 text-[10px] font-bold text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE WINDOW
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/80">
                        {camera.enabled ? "STANDBY" : "OFF"}
                      </span>
                    )}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <span className="truncate text-xs font-semibold text-white">{camera.name}</span>
                    <Eye className="h-3.5 w-3.5 shrink-0 text-white/70 transition group-hover:text-white" />
                  </span>
                </button>

                {/* meta */}
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {camera.classroomName ?? (
                          <span className="text-ck-red">Unmapped classroom</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {camera.branchName.replace("Climb Kiddo — ", "")} ·{" "}
                        <code className="rounded bg-muted px-1">{camera.streamPath}</code>
                      </p>
                    </div>
                    <RowActions
                      label="Camera actions"
                      actions={[
                        { label: "Camera details", icon: <Eye />, onSelect: () => setViewing(camera) },
                        {
                          label: camera.enabled ? "Switch off (kill-switch)" : "Switch on",
                          icon: camera.enabled ? <VideoOff /> : <Power />,
                          disabled: busyId === camera.id,
                          onSelect: () => toggleEnabled(camera),
                        },
                        {
                          label: "Copy stream path",
                          icon: <Copy />,
                          separatorBefore: true,
                          onSelect: () => copy(camera.streamPath, "Stream path"),
                        },
                        {
                          label: "Copy MediaMTX path config",
                          icon: <Copy />,
                          onSelect: () =>
                            copy(
                              `paths:\n  ${camera.streamPath}:\n    source: <rtsp url>\n    sourceOnDemand: yes`,
                              "mediamtx.yml snippet",
                            ),
                        },
                        {
                          label: "Open parent view",
                          icon: <ExternalLink />,
                          onSelect: () => window.open("/parent/cctv", "_blank"),
                        },
                      ]}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={camera.enabled ? "secondary" : "destructive"}>
                      {camera.enabled ? "On" : "Off"}
                    </Badge>
                    <Badge variant={camera.parentViewable ? "outline" : "secondary"}>
                      {camera.parentViewable ? "Parent-visible" : "Staff only"}
                    </Badge>
                    {!camera.classroomId && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> No parents can see it
                      </Badge>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <SectionCard title="How viewing works" description="The access rules the camera service enforces on every request">
        <ol className="space-y-1.5 text-sm text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">1.</span> A parent opens{" "}
            <Link href="/parent/cctv" className="font-medium text-ck-red hover:underline">
              /parent/cctv
            </Link>
            . They see a camera only if it is switched on, marked parent-visible, and mapped to their own child&apos;s
            classroom.
          </li>
          <li>
            <span className="font-semibold text-foreground">2.</span> The request must fall inside that branch&apos;s
            school hours. Outside the window, access is refused and logged.
          </li>
          <li>
            <span className="font-semibold text-foreground">3.</span> The server mints a 60-second token for that one
            camera. MediaMTX validates it on every read; RTSP credentials never reach a browser.
          </li>
          <li>
            <span className="font-semibold text-foreground">4.</span> Nothing is recorded. Every decision lands in the{" "}
            <Link href="/admin/audit" className="font-medium text-ck-red hover:underline">
              audit log
            </Link>
            .
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Staff live preview, per-parent access grants, editing and deleting cameras, and the school-hours editor arrive
          with the camera service in the backend phase.
        </p>
      </SectionCard>

      {/* details */}
      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.name ?? ""}
        description={viewing ? `${viewing.classroomName ?? "Unmapped"} · ${viewing.branchName}` : undefined}
        size="lg"
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button
                variant={viewing.enabled ? "destructive" : "default"}
                disabled={busyId === viewing.id}
                onClick={() => {
                  toggleEnabled(viewing);
                  setViewing(null);
                }}
              >
                {viewing.enabled ? (
                  <>
                    <VideoOff /> Switch off
                  </>
                ) : (
                  <>
                    <Power /> Switch on
                  </>
                )}
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <>
            {(() => {
              const branch = branches.find((b) => b.id === viewing.branchId);
              const state = tileState(viewing, branch, mediaConfigured);
              const copyText = TILE_COPY[state];
              return (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-ck-navy px-6 text-center">
                  <span className="text-5xl" aria-hidden>
                    {copyText.emoji}
                  </span>
                  <p className="font-heading text-lg font-bold text-white">{copyText.title}</p>
                  <p className="max-w-sm text-sm text-white/60">{copyText.body}</p>
                  {state === "ready" && (
                    <p className="mt-1 text-xs text-white/50">
                      Staff preview needs a staff-scoped view token — parents can watch this feed now.
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
              <InfoItem label="Stream path" value={<code>{viewing.streamPath}</code>} />
              <InfoItem label="Kill-switch" value={viewing.enabled ? "On" : "Off"} />
              <InfoItem label="Classroom" value={viewing.classroomName ?? "Unmapped"} />
              <InfoItem label="Branch" value={viewing.branchName.replace("Climb Kiddo — ", "")} />
              <InfoItem label="Visible to parents" value={viewing.parentViewable ? "Yes" : "Staff only"} />
              <InfoItem
                label="School hours"
                value={(() => {
                  const b = branches.find((x) => x.id === viewing.branchId);
                  return b?.opensAt && b?.closesAt ? `${b.opensAt}–${b.closesAt}` : "not set";
                })()}
              />
            </div>

            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              RTSP credentials for this camera are stored server-side and are never sent to a browser — not even to this
              admin page.
            </div>
          </>
        )}
      </DetailDialog>

      {/* add camera */}
      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add a camera"
        description="Register a feed MediaMTX already publishes, then map it to a classroom."
        submitLabel="Add camera"
        onSubmit={addCamera}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Name"
            required
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="Toddler Room — Front"
          />
          <TextField
            label="Stream path"
            required
            value={form.streamPath}
            onChange={(v) => setForm({ ...form, streamPath: v })}
            placeholder="classroom-a"
            hint="Must match the path name in mediamtx.yml"
          />
          <SelectField
            label="Branch"
            value={form.branchId}
            onChange={(v) => setForm({ ...form, branchId: v, classroomId: "" })}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
          <SelectField
            label="Classroom"
            value={form.classroomId}
            onChange={(v) => setForm({ ...form, classroomId: v })}
            options={classroomsFor(form.branchId).map((c) => ({ value: c.id, label: c.name }))}
            placeholder="— unmapped —"
            hint="This is what scopes parent access"
          />
        </div>
        <TextField
          label="Source RTSP URL"
          required
          value={form.rtspUrl}
          onChange={(v) => setForm({ ...form, rtspUrl: v })}
          placeholder="rtsp://user:pass@nvr-ip:554/Streaming/Channels/101"
          hint="Stored server-side only — never sent to parents"
        />
        <CheckboxField
          label="Visible to parents"
          checked={form.parentViewable}
          onChange={(c) => setForm({ ...form, parentViewable: c })}
        />
      </FormDialog>
    </div>
  );
}
