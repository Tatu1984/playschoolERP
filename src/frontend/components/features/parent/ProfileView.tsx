"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { LogOut, Pencil, Smartphone, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useGuardianId, useSession } from "@/frontend/store/session";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { attendanceRate, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { SectionCard, EmojiAvatar, InfoItem } from "@/frontend/components/ui/Bits";
import { FormDialog, ConfirmDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { CATALOGUE } from "@/shared/fixtures";
import type { Guardian } from "@/shared/types/school.types";
import { ageFrom } from "@/shared/utils/date.util";
import { formatDate, timeAgo } from "@/frontend/utils/formatters";

export function ProfileView() {
  const session = useSession();
  const guardianId = useGuardianId();
  const { kids } = useSelectedChild();
  const guardians = useErpStore((s) => s.guardians);
  const classrooms = useErpStore((s) => s.classrooms);
  const branches = useErpStore((s) => s.branches);
  const attendance = useErpStore((s) => s.attendance);
  const devices = useErpStore((s) => s.devices);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const guardian = guardians.find((g) => g.id === guardianId);
  const [draft, setDraft] = useState<Guardian | null>(null);
  const [signOutAll, setSignOutAll] = useState(false);

  if (!guardian) return <EmptyState emoji="🤷" title="Profile not found" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="My profile"
        description="Your details, your children and the devices signed in to this account."
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Profile" }]}
        actions={
          <Button variant="outline" onClick={() => setDraft(guardian)}>
            <Pencil /> Edit profile
          </Button>
        }
      />

      <div className="rounded-3xl bg-gradient-to-br from-ck-navy/10 to-ck-blue/10 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-ck-navy text-lg font-bold text-white">
            {guardian.name
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xl font-bold">{guardian.name}</h2>
            <p className="text-sm text-muted-foreground">
              {guardian.relation.toLowerCase()} · {guardian.occupation || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {guardian.email} · {guardian.phone}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {guardian.canPickup && <Badge variant="secondary">Authorised for pickup</Badge>}
            {guardian.isEmergencyContact && <Badge variant="outline">Emergency contact</Badge>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Contact details" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Full name" value={guardian.name} />
            <InfoItem label="Relation" value={guardian.relation.toLowerCase()} />
            <InfoItem label="Email" value={guardian.email} />
            <InfoItem label="Phone" value={guardian.phone} />
            <InfoItem label="Occupation" value={guardian.occupation || "—"} />
            <InfoItem label="Portal access" value={guardian.userId ? "Active" : "Invite pending"} />
            <InfoItem label="Address" value={guardian.address || "—"} className="col-span-2" />
          </div>
        </SectionCard>

        <SectionCard title={`My children (${kids.length})`}>
          {kids.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">No children linked yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {kids.map((k) => {
                const classroom = classrooms.find((c) => c.id === k.classroomId);
                return (
                  <li key={k.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <EmojiAvatar emoji={k.photoEmoji} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{studentName(k)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {classroom?.name ?? "Unassigned"} ·{" "}
                        {CATALOGUE.programs.find((p) => p.slug === k.programSlug)?.name} · {ageFrom(k.dob)} yrs
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={k.status} />
                      <span className="text-[10px] text-muted-foreground">
                        {attendanceRate(attendance, k.id)}% attendance
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Something wrong here? <Link href="/parent/messages" className="font-medium text-ck-red hover:underline">Message the office</Link>.
          </p>
        </SectionCard>

        <SectionCard title="School" description="Where your children go">
          <ul className="space-y-2.5">
            {branches
              .filter((b) => kids.some((k) => k.branchId === b.id))
              .map((b) => (
                <li key={b.id} className="rounded-xl border p-3">
                  <p className="text-sm font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.address}, {b.city} {b.pincode}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.phone} · open {b.opensAt}–{b.closesAt}
                  </p>
                </li>
              ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Signed-in devices"
          icon={<Smartphone className="h-4 w-4" />}
          action={
            <Button size="xs" variant="outline" onClick={() => setSignOutAll(true)}>
              <LogOut /> Sign out all
            </Button>
          }
        >
          <ul className="space-y-2">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.platform.toLowerCase()} · last seen {timeAgo(d.lastSeenAt)} · added {formatDate(d.createdAt)}
                  </p>
                </div>
                <RowActions
                  label="Device"
                  actions={[
                    {
                      label: "Sign out this device",
                      icon: <LogOut />,
                      destructive: true,
                      onSelect: () => {
                        removeItem("devices", d.id);
                        toast.success(`${d.label} signed out`);
                      },
                    },
                  ]}
                />
              </li>
            ))}
            {devices.length === 0 && (
              <li className="py-3 text-center text-sm text-muted-foreground">No devices registered.</li>
            )}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Account" description={`Signed in as ${session.email}`}>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success("Password reset link sent to your email")}>
            Change password
          </Button>
          <Button variant="outline" asChild>
            <Link href="/parent/settings">Notification settings</Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => toast.info("Data export requests go to the school office under GDPR/DPDP")}
          >
            <Trash2 /> Request my data
          </Button>
        </div>
      </SectionCard>

      <FormDialog
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        title="Edit profile"
        submitLabel="Save"
        onSubmit={() => {
          if (!draft || !draft.name.trim()) {
            toast.error("Name is required");
            return false;
          }
          patchItem("guardians", draft.id, draft);
          toast.success("Profile updated");
          setDraft(null);
          return true;
        }}
        size="lg"
      >
        {draft && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Full name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <SelectField
                label="Relation to child"
                value={draft.relation}
                onChange={(v) => setDraft({ ...draft, relation: v as Guardian["relation"] })}
                options={["MOTHER", "FATHER", "GRANDPARENT", "UNCLE", "AUNT", "OTHER"].map((r) => ({
                  value: r,
                  label: r.charAt(0) + r.slice(1).toLowerCase(),
                }))}
              />
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
              <TextField label="Phone" type="tel" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
              <TextField label="Occupation" value={draft.occupation} onChange={(v) => setDraft({ ...draft, occupation: v })} />
            </div>
            <TextareaField label="Address" rows={2} value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
          </>
        )}
      </FormDialog>

      <ConfirmDialog
        open={signOutAll}
        onOpenChange={setSignOutAll}
        title="Sign out of all devices?"
        description="You'll need to sign in again everywhere, including the mobile app."
        confirmLabel="Sign out everywhere"
        onConfirm={() => {
          devices.forEach((d) => removeItem("devices", d.id));
          toast.success("Signed out of all devices");
        }}
      />
    </div>
  );
}
