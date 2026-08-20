"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Phone,
  Pencil,
  Plus,
  Siren,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { SectionCard, InfoItem, Tag } from "@/frontend/components/ui/Bits";
import { ConfirmDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { ListField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import type { EmergencyContact, MedicalProfile } from "@/shared/types/ops.types";
import { newId } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { formatDateTime } from "@/frontend/utils/formatters";

export function EmergencyView() {
  const session = useSession();
  const { child } = useSelectedChild();
  const branches = useErpStore((s) => s.branches);
  const contacts = useErpStore((s) => s.emergencyContacts);
  const medical = useErpStore((s) => s.medicalProfiles);
  const broadcasts = useErpStore((s) => s.safetyBroadcasts);
  const settings = useErpStore((s) => s.settings);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);
  const upsertMedical = useErpStore((s) => s.upsertMedicalProfile);

  const [contactDraft, setContactDraft] = useState<EmergencyContact | null>(null);
  const [isNewContact, setIsNewContact] = useState(false);
  const [deleting, setDeleting] = useState<EmergencyContact | null>(null);
  const [medicalDraft, setMedicalDraft] = useState<MedicalProfile | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertNote, setAlertNote] = useState("");

  if (!child) return <EmptyState emoji="👶" title="No child linked to this account" />;

  const branch = branches.find((b) => b.id === child.branchId);
  const mine = contacts.filter((c) => c.studentId === child.id).sort((a, b) => a.priority - b.priority);
  const profile =
    medical.find((m) => m.studentId === child.id) ??
    ({
      studentId: child.id,
      bloodGroup: child.bloodGroup,
      allergies: child.allergies,
      conditions: [],
      medications: [],
      doctorName: "",
      doctorPhone: "",
      insuranceNo: "",
      notes: child.medicalNotes,
    } satisfies MedicalProfile);

  const childId = child.id;

  function saveMedical(): boolean {
    if (!medicalDraft) return false;
    upsertMedical(medicalDraft);
    patchItem("students", childId, {
      allergies: medicalDraft.allergies,
      bloodGroup: medicalDraft.bloodGroup,
      medicalNotes: medicalDraft.notes,
    });
    toast.success("Medical information updated — the school has been notified");
    setMedicalDraft(null);
    return true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Emergency &amp; safety"
        description="Who we call, what we must know, and how we reach you."
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Emergency" }]}
        actions={
          <Button variant="destructive" onClick={() => setAlertOpen(true)}>
            <Siren /> Contact the school urgently
          </Button>
        }
      />

      {/* quick dial */}
      <div className="grid gap-3 sm:grid-cols-3">
        <a
          href={`tel:${branch?.phone ?? settings.supportPhone}`}
          className="flex items-center gap-3 rounded-2xl border border-ck-red/30 bg-ck-red/5 p-4 transition hover:bg-ck-red/10"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ck-red text-white">
            <Phone className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{branch?.name ?? "School office"}</span>
            <span className="block truncate text-xs text-muted-foreground">{branch?.phone ?? settings.supportPhone}</span>
          </span>
        </a>
        <a
          href={`tel:${profile.doctorPhone || settings.supportPhone}`}
          className="flex items-center gap-3 rounded-2xl border p-4 transition hover:bg-muted"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ck-blue/15 text-ck-blue">
            <Stethoscope className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{profile.doctorName || "Add your doctor"}</span>
            <span className="block truncate text-xs text-muted-foreground">{profile.doctorPhone || "not on file"}</span>
          </span>
        </a>
        <a href="tel:108" className="flex items-center gap-3 rounded-2xl border p-4 transition hover:bg-muted">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ck-orange/15 text-ck-orange">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Ambulance</span>
            <span className="block text-xs text-muted-foreground">108 · national helpline</span>
          </span>
        </a>
      </div>

      {/* broadcasts */}
      {broadcasts.length > 0 && (
        <SectionCard title="Safety broadcasts" description="Messages the school sent to all parents">
          <ul className="space-y-2.5">
            {broadcasts.map((b) => (
              <li key={b.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {b.title}
                      <StatusBadge status={b.severity} />
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{b.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.sentByName} · {formatDateTime(b.createdAt)}
                    </p>
                  </div>
                  {b.acknowledgedBy.includes(session.id) ? (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Check className="h-3 w-3" /> Read
                    </Badge>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        patchItem("safetyBroadcasts", b.id, { acknowledgedBy: [...b.acknowledgedBy, session.id] });
                        toast.success("Acknowledged");
                      }}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* contacts */}
        <SectionCard
          title={`Emergency contacts (${mine.length})`}
          description="We call these in order until someone answers."
          action={
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setIsNewContact(true);
                setContactDraft({
                  id: "",
                  studentId: child.id,
                  name: "",
                  relation: "",
                  phone: "",
                  priority: mine.length + 1,
                  createdAt: "",
                });
              }}
            >
              <Plus /> Add
            </Button>
          }
        >
          {mine.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No contacts on file yet.</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold">
                      {c.priority}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.relation} · {c.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon-sm" variant="ghost" asChild aria-label={`Call ${c.name}`}>
                      <a href={`tel:${c.phone}`}>
                        <Phone />
                      </a>
                    </Button>
                    <RowActions
                      label="Contact"
                      actions={[
                        {
                          label: "Edit",
                          icon: <Pencil />,
                          onSelect: () => {
                            setIsNewContact(false);
                            setContactDraft(c);
                          },
                        },
                        {
                          label: "Move up",
                          disabled: c.priority <= 1,
                          onSelect: () => {
                            patchItem("emergencyContacts", c.id, { priority: c.priority - 1 });
                            toast.success("Order updated");
                          },
                        },
                        { label: "Remove", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(c) },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* medical */}
        <SectionCard
          title="Medical information"
          description={`On file for ${child.firstName}`}
          icon={<Stethoscope className="h-4 w-4 text-ck-blue" />}
          action={
            <Button size="xs" variant="outline" onClick={() => setMedicalDraft(profile)}>
              <Pencil /> Update
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Blood group" value={profile.bloodGroup || "—"} />
            <InfoItem label="Insurance" value={profile.insuranceNo || "—"} />
            <div className="col-span-2">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Allergies</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {profile.allergies.length ? (
                  profile.allergies.map((a) => (
                    <Tag key={a} tone="brand">
                      ⚠️ {a}
                    </Tag>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None recorded</span>
                )}
              </div>
            </div>
            {profile.conditions.length > 0 && (
              <InfoItem label="Conditions" value={profile.conditions.join(", ")} className="col-span-2" />
            )}
            {profile.medications.length > 0 && (
              <InfoItem label="Medications" value={profile.medications.join(", ")} className="col-span-2" />
            )}
            <InfoItem label="Doctor" value={profile.doctorName || "—"} />
            <InfoItem label="Doctor's phone" value={profile.doctorPhone || "—"} />
            {profile.notes && <InfoItem label="Notes" value={profile.notes} className="col-span-2" />}
          </div>
        </SectionCard>
      </div>

      {/* contact form */}
      <FormDialog
        open={!!contactDraft}
        onOpenChange={(o) => !o && setContactDraft(null)}
        title={isNewContact ? "Add an emergency contact" : "Edit contact"}
        submitLabel="Save"
        onSubmit={() => {
          if (!contactDraft || !contactDraft.name.trim() || !contactDraft.phone.trim()) {
            toast.error("Name and phone are required");
            return false;
          }
          if (isNewContact) {
            addItem("emergencyContacts", { ...contactDraft, id: newId("ec"), createdAt: nowIso() });
            toast.success("Contact added");
          } else {
            patchItem("emergencyContacts", contactDraft.id, contactDraft);
            toast.success("Contact updated");
          }
          setContactDraft(null);
          return true;
        }}
        size="sm"
      >
        {contactDraft && (
          <>
            <TextField label="Name" required value={contactDraft.name} onChange={(v) => setContactDraft({ ...contactDraft, name: v })} />
            <TextField label="Relation" value={contactDraft.relation} onChange={(v) => setContactDraft({ ...contactDraft, relation: v })} placeholder="Grandmother" />
            <TextField label="Phone" required type="tel" value={contactDraft.phone} onChange={(v) => setContactDraft({ ...contactDraft, phone: v })} />
            <TextField
              label="Call order"
              type="number"
              min={1}
              value={contactDraft.priority}
              onChange={(v) => setContactDraft({ ...contactDraft, priority: Number(v) || 1 })}
            />
          </>
        )}
      </FormDialog>

      {/* medical form */}
      <FormDialog
        open={!!medicalDraft}
        onOpenChange={(o) => !o && setMedicalDraft(null)}
        title="Update medical information"
        description="Teachers and the office see this immediately."
        submitLabel="Save"
        onSubmit={saveMedical}
        size="lg"
      >
        {medicalDraft && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Blood group" value={medicalDraft.bloodGroup} onChange={(v) => setMedicalDraft({ ...medicalDraft, bloodGroup: v })} />
              <TextField label="Insurance number" value={medicalDraft.insuranceNo} onChange={(v) => setMedicalDraft({ ...medicalDraft, insuranceNo: v })} />
              <TextField label="Doctor's name" value={medicalDraft.doctorName} onChange={(v) => setMedicalDraft({ ...medicalDraft, doctorName: v })} />
              <TextField label="Doctor's phone" type="tel" value={medicalDraft.doctorPhone} onChange={(v) => setMedicalDraft({ ...medicalDraft, doctorPhone: v })} />
            </div>
            <ListField label="Allergies" values={medicalDraft.allergies} onChange={(v) => setMedicalDraft({ ...medicalDraft, allergies: v })} placeholder="Peanuts, Dairy" />
            <ListField label="Conditions" values={medicalDraft.conditions} onChange={(v) => setMedicalDraft({ ...medicalDraft, conditions: v })} placeholder="Asthma" />
            <ListField label="Medications" values={medicalDraft.medications} onChange={(v) => setMedicalDraft({ ...medicalDraft, medications: v })} placeholder="Inhaler as needed" />
            <TextareaField label="Anything else we should know" rows={3} value={medicalDraft.notes} onChange={(v) => setMedicalDraft({ ...medicalDraft, notes: v })} />
          </>
        )}
      </FormDialog>

      {/* urgent contact */}
      <FormDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Contact the school urgently"
        description="This pings the branch phone and the class teacher's app at once. Please call 108 for a medical emergency."
        submitLabel="Send alert"
        destructive
        onSubmit={() => {
          if (!alertNote.trim()) {
            toast.error("Tell us what's happening");
            return false;
          }
          toast.success("Alert sent — the office is calling you now");
          setAlertNote("");
          return true;
        }}
      >
        <TextareaField
          label="What's happening?"
          rows={4}
          value={alertNote}
          onChange={setAlertNote}
          placeholder="I'm stuck in traffic and will be 40 minutes late for pickup."
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Remove ${deleting?.name}?`}
        description="They will no longer be called in an emergency."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("emergencyContacts", deleting.id);
          toast.success("Contact removed");
          setDeleting(null);
        }}
      />
    </div>
  );
}
