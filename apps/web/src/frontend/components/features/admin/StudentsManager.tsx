"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Eye,
  FileDown,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useBranchScope } from "@/frontend/hooks/useSelection";
import { useSession } from "@/frontend/store/session";
import { attendanceRate, milestonesOf, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { ConfirmDialog, DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { ListField, SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { EmojiAvatar, InfoItem, Tag } from "@/frontend/components/ui/Bits";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { CATALOGUE } from "@/shared/fixtures";
import type { Student } from "@/shared/types/school.types";
import { ageFrom, dateKey, nowIso } from "@/shared/utils/date.util";
import { newId } from "@/shared/utils/common.util";
import { formatDate } from "@/frontend/utils/formatters";
import { CoverageNote } from "@/frontend/components/ui/CoverageNote";

type Draft = {
  firstName: string;
  lastName: string;
  dob: string;
  gender: Student["gender"];
  branchId: string;
  classroomId: string;
  status: Student["status"];
  bloodGroup: string;
  allergies: string[];
  medicalNotes: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelation: "MOTHER" | "FATHER" | "GRANDPARENT" | "UNCLE" | "AUNT" | "OTHER";
};

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "M",
  branchId: "br_kathgola",
  classroomId: "",
  status: "ACTIVE",
  bloodGroup: "O+",
  allergies: [],
  medicalNotes: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianRelation: "MOTHER",
};

export function StudentsManager() {
  const session = useSession();
  const { branches, inScope } = useBranchScope();

  const students = useErpStore((s) => s.students);
  const guardians = useErpStore((s) => s.guardians);
  const classrooms = useErpStore((s) => s.classrooms);
  const attendance = useErpStore((s) => s.attendance);
  const milestones = useErpStore((s) => s.milestones);
  const invoices = useErpStore((s) => s.invoices);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);
  const removeMany = useErpStore((s) => s.removeMany);
  const logAudit = useErpStore((s) => s.logAudit);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<Student | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [moving, setMoving] = useState<Student | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [deleting, setDeleting] = useState<Student | null>(null);

  const rows = inScope(students);
  const classOptions = classrooms
    .filter((c) => !draft.branchId || c.branchId === draft.branchId)
    .map((c) => ({ value: c.id, label: `${c.name} · ${c.programSlug}` }));

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setDraft(EMPTY);
    setFormOpen(true);
  }

  function openEdit(student: Student) {
    const guardian = guardians.find((g) => student.guardianIds.includes(g.id));
    setEditing(student);
    setDraft({
      firstName: student.firstName,
      lastName: student.lastName,
      dob: dateKey(student.dob),
      gender: student.gender,
      branchId: student.branchId,
      classroomId: student.classroomId ?? "",
      status: student.status,
      bloodGroup: student.bloodGroup,
      allergies: student.allergies,
      medicalNotes: student.medicalNotes,
      guardianName: guardian?.name ?? student.primaryGuardianName ?? "",
      guardianPhone: guardian?.phone ?? "",
      guardianEmail: guardian?.email ?? "",
      guardianRelation: guardian?.relation ?? "MOTHER",
    });
    setFormOpen(true);
  }

  function save(): boolean {
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.dob) {
      toast.error("Name and date of birth are required");
      return false;
    }
    const classroom = classrooms.find((c) => c.id === draft.classroomId);

    if (editing) {
      patchItem("students", editing.id, {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        dob: new Date(draft.dob).toISOString(),
        gender: draft.gender,
        branchId: draft.branchId,
        classroomId: draft.classroomId || null,
        programSlug: classroom?.programSlug ?? editing.programSlug,
        status: draft.status,
        bloodGroup: draft.bloodGroup,
        allergies: draft.allergies,
        medicalNotes: draft.medicalNotes,
        primaryGuardianName: draft.guardianName,
      });
      const guardianId = editing.guardianIds[0];
      if (guardianId && guardians.some((g) => g.id === guardianId)) {
        patchItem("guardians", guardianId, {
          name: draft.guardianName,
          phone: draft.guardianPhone,
          email: draft.guardianEmail,
          relation: draft.guardianRelation,
        });
      }
      logAudit({
        actorName: session.name,
        actorRole: session.role,
        action: "student.update",
        target: `${draft.firstName} ${draft.lastName}`,
        detail: `class → ${classroom?.name ?? "unassigned"}, status → ${draft.status}`,
        ip: "local",
      });
      toast.success(`${draft.firstName} updated`);
      return true;
    }

    const studentId = newId("stu");
    const guardianId = newId("gd");
    addItem("guardians", {
      id: guardianId,
      name: draft.guardianName || "Guardian",
      email: draft.guardianEmail,
      phone: draft.guardianPhone,
      relation: draft.guardianRelation,
      occupation: "",
      address: "",
      userId: null,
      studentIds: [studentId],
      canPickup: true,
      isEmergencyContact: true,
      createdAt: nowIso(),
    });
    addItem("students", {
      id: studentId,
      branchId: draft.branchId,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      admissionNo: `CK2026${100 + students.length + 1}`,
      dob: new Date(draft.dob).toISOString(),
      gender: draft.gender,
      classroomId: draft.classroomId || null,
      programSlug: classroom?.programSlug ?? "nursery",
      status: draft.status,
      enrolledOn: nowIso(),
      photoEmoji: draft.gender === "F" ? "👧" : "🧒",
      bloodGroup: draft.bloodGroup,
      allergies: draft.allergies,
      medicalNotes: draft.medicalNotes,
      guardianIds: [guardianId],
      primaryGuardianName: draft.guardianName,
      createdAt: nowIso(),
    });
    logAudit({
      actorName: session.name,
      actorRole: session.role,
      action: "student.enroll",
      target: `${draft.firstName} ${draft.lastName}`,
      detail: `enrolled into ${classroom?.name ?? "no class"}`,
      ip: "local",
    });
    toast.success(`${draft.firstName} enrolled`);
    return true;
  }

  const columns: Column<Student>[] = [
    {
      key: "child",
      header: "Child",
      sortValue: (s) => studentName(s),
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <EmojiAvatar emoji={s.photoEmoji} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{studentName(s)}</p>
            <p className="truncate text-xs text-muted-foreground">{s.admissionNo}</p>
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      hideOnMobile: true,
      sortValue: (s) => classrooms.find((c) => c.id === s.classroomId)?.name ?? "—",
      cell: (s) => {
        const c = classrooms.find((x) => x.id === s.classroomId);
        return c ? (
          <div>
            <p className="text-sm">{c.name}</p>
            <p className="text-xs text-muted-foreground">{branches.find((b) => b.id === c.branchId)?.code}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        );
      },
    },
    {
      key: "age",
      header: "Age",
      hideOnMobile: true,
      sortValue: (s) => ageFrom(s.dob),
      cell: (s) => <span className="tabular-nums">{ageFrom(s.dob)} yrs</span>,
    },
    {
      key: "guardian",
      header: "Guardian",
      hideOnMobile: true,
      sortValue: (s) => s.primaryGuardianName ?? "",
      cell: (s) => {
        const g = guardians.find((x) => s.guardianIds.includes(x.id));
        return (
          <div className="min-w-0">
            <p className="truncate text-sm">{g?.name ?? s.primaryGuardianName ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{g?.phone ?? ""}</p>
          </div>
        );
      },
    },
    {
      key: "attendance",
      header: "Attendance",
      hideOnMobile: true,
      sortValue: (s) => attendanceRate(attendance, s.id),
      cell: (s) => {
        const rate = attendanceRate(attendance, s.id);
        return (
          <span className={rate >= 90 ? "text-emerald-600" : rate >= 75 ? "text-amber-600" : "text-ck-red"}>
            {rate}%
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortValue: (s) => s.status,
      cell: (s) => <StatusBadge status={s.status} />,
    },
  ];

  const active = rows.filter((s) => s.status === "ACTIVE").length;
  const unassigned = rows.filter((s) => !s.classroomId).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        description="Enrol children, assign them to a classroom and keep guardian details current."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Students" }]}
        actions={
          <Button onClick={openCreate}>
            <Plus /> Enrol student
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total" value={rows.length} icon={<Users className="h-4 w-4" />} accent="navy" />
        <KpiCard label="Active" value={active} accent="green" sub={`${rows.length - active} inactive`} />
        <KpiCard label="Unassigned" value={unassigned} accent={unassigned ? "orange" : "muted"} sub="no classroom" />
        <KpiCard
          label="Fees pending"
          value={invoices.filter((i) => i.status !== "PAID").length}
          accent="brand"
          href="/admin/fees"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowId={(s) => s.id}
        searchable={(s) => `${studentName(s)} ${s.admissionNo} ${s.primaryGuardianName ?? ""}`}
        searchPlaceholder="Search name, admission no, guardian…"
        exportName="students"
        onRowClick={(s) => setViewing(s)}
        filters={[
          {
            key: "class",
            label: "Class",
            options: classrooms.map((c) => ({ value: c.id, label: c.name })),
            predicate: (s, v) => s.classroomId === v,
          },
          {
            key: "program",
            label: "Program",
            options: CATALOGUE.programs.map((p) => ({ value: p.slug, label: p.name })),
            predicate: (s, v) => s.programSlug === v,
          },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "ON_LEAVE", label: "On leave" },
              { value: "GRADUATED", label: "Graduated" },
              { value: "WITHDRAWN", label: "Withdrawn" },
            ],
            predicate: (s, v) => s.status === v,
          },
        ]}
        rowActions={(s) => [
          { label: "View profile", icon: <Eye />, onSelect: () => setViewing(s) },
          { label: "Edit details", icon: <Pencil />, onSelect: () => openEdit(s) },
          {
            label: "Move class",
            icon: <ArrowRightLeft />,
            onSelect: () => {
              setMoving(s);
              setMoveTarget(s.classroomId ?? "");
            },
          },
          {
            label: "Message guardian",
            icon: <MessageCircle />,
            onSelect: () => toast.info(`Opening a thread with ${s.primaryGuardianName ?? "the guardian"}…`),
          },
          {
            label: s.status === "WITHDRAWN" ? "Reactivate" : "Mark withdrawn",
            icon: <UserMinus />,
            separatorBefore: true,
            onSelect: () => {
              patchItem("students", s.id, { status: s.status === "WITHDRAWN" ? "ACTIVE" : "WITHDRAWN" });
              toast.success(`${s.firstName} ${s.status === "WITHDRAWN" ? "reactivated" : "marked withdrawn"}`);
            },
          },
          { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(s) },
        ]}
        bulkActions={(ids, clear) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                ids.forEach((id) => patchItem("students", id, { status: "ON_LEAVE" }));
                toast.success(`${ids.length} students marked on leave`);
                clear();
              }}
            >
              Mark on leave
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success(`${ids.length} records queued for export`)}>
              <FileDown /> Export selected
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                removeMany("students", ids);
                toast.success(`${ids.length} students removed`);
                clear();
              }}
            >
              Delete
            </Button>
          </>
        )}
        emptyTitle="No students yet"
        emptyDescription="Enrol your first child to get started."
        emptyEmoji="🧒"
        emptyAction={
          <Button onClick={openCreate}>
            <Plus /> Enrol student
          </Button>
        }
      />

      {/* Create / edit */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${studentName(editing)}` : "Enrol a student"}
        description={editing ? "Update the child's record." : "Creates the child plus a primary guardian contact."}
        submitLabel={editing ? "Save changes" : "Enrol"}
        onSubmit={save}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="First name" required value={draft.firstName} onChange={(v) => set("firstName", v)} />
          <TextField label="Last name" required value={draft.lastName} onChange={(v) => set("lastName", v)} />
          <TextField label="Date of birth" required type="date" value={draft.dob} onChange={(v) => set("dob", v)} />
          <SelectField
            label="Gender"
            value={draft.gender}
            onChange={(v) => set("gender", v as Student["gender"])}
            options={[
              { value: "M", label: "Boy" },
              { value: "F", label: "Girl" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <SelectField
            label="Branch"
            value={draft.branchId}
            onChange={(v) => {
              set("branchId", v);
              set("classroomId", "");
            }}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
          <SelectField
            label="Classroom"
            value={draft.classroomId}
            onChange={(v) => set("classroomId", v)}
            options={classOptions}
            placeholder="— unassigned —"
          />
          <SelectField
            label="Status"
            value={draft.status}
            onChange={(v) => set("status", v as Student["status"])}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "ON_LEAVE", label: "On leave" },
              { value: "GRADUATED", label: "Graduated" },
              { value: "WITHDRAWN", label: "Withdrawn" },
            ]}
          />
          <SelectField
            label="Blood group"
            value={draft.bloodGroup}
            onChange={(v) => set("bloodGroup", v)}
            options={["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => ({ value: b, label: b }))}
          />
        </div>

        <ListField label="Allergies" values={draft.allergies} onChange={(v) => set("allergies", v)} placeholder="Peanuts, Dairy" />
        <TextareaField
          label="Medical notes"
          rows={2}
          value={draft.medicalNotes}
          onChange={(v) => set("medicalNotes", v)}
          placeholder="Anything the class teacher must know"
        />

        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Primary guardian</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Name" value={draft.guardianName} onChange={(v) => set("guardianName", v)} />
            <SelectField
              label="Relation"
              value={draft.guardianRelation}
              onChange={(v) => set("guardianRelation", v as Draft["guardianRelation"])}
              options={[
                { value: "MOTHER", label: "Mother" },
                { value: "FATHER", label: "Father" },
                { value: "GRANDPARENT", label: "Grandparent" },
                { value: "UNCLE", label: "Uncle" },
                { value: "AUNT", label: "Aunt" },
                { value: "OTHER", label: "Other" },
              ]}
            />
            <TextField label="Phone" type="tel" value={draft.guardianPhone} onChange={(v) => set("guardianPhone", v)} />
            <TextField label="Email" type="email" value={draft.guardianEmail} onChange={(v) => set("guardianEmail", v)} />
          </div>
        </div>
      </FormDialog>

      {/* Profile */}
      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing ? studentName(viewing) : ""}
        description={viewing ? `${viewing.admissionNo} · enrolled ${formatDate(viewing.enrolledOn)}` : undefined}
        size="lg"
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const s = viewing;
                  setViewing(null);
                  openEdit(s);
                }}
              >
                <Pencil /> Edit
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <>
            <div className="flex items-center gap-3">
              <EmojiAvatar emoji={viewing.photoEmoji} size="lg" />
              <div>
                <p className="font-heading text-lg font-bold">{studentName(viewing)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={viewing.status} />
                  <Badge variant="outline">{classrooms.find((c) => c.id === viewing.classroomId)?.name ?? "Unassigned"}</Badge>
                  <Badge variant="secondary">{ageFrom(viewing.dob)} yrs</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border p-3 sm:grid-cols-3">
              <InfoItem label="Program" value={CATALOGUE.programs.find((p) => p.slug === viewing.programSlug)?.name ?? "—"} />
              <InfoItem label="Branch" value={branches.find((b) => b.id === viewing.branchId)?.name ?? "—"} />
              <InfoItem label="Date of birth" value={formatDate(viewing.dob)} />
              <InfoItem label="Blood group" value={viewing.bloodGroup} />
              <InfoItem
                label="Attendance"
                value={`${attendanceRate(attendance, viewing.id)}%`}
              />
              <InfoItem label="Milestones" value={milestonesOf(milestones, viewing.id).length} />
            </div>
            {/* Attendance and milestones here are within the loaded window, and
                this dialog is exactly where somebody reads them as "since she
                joined". */}
            <CoverageNote collection="attendance" noun="Attendance and milestones" />

            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Allergies &amp; medical</p>
              {viewing.allergies.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {viewing.allergies.map((a) => (
                    <Tag key={a} tone="brand">
                      ⚠️ {a}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No known allergies.</p>
              )}
              {viewing.medicalNotes && <p className="mt-1.5 text-sm text-muted-foreground">{viewing.medicalNotes}</p>}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Guardians</p>
              <ul className="space-y-1.5">
                {guardians
                  .filter((g) => viewing.guardianIds.includes(g.id))
                  .map((g) => (
                    <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                      <span>
                        <span className="font-medium">{g.name}</span>{" "}
                        <span className="text-xs text-muted-foreground">({g.relation.toLowerCase()})</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {g.phone} · {g.email}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Recent milestones</p>
              {milestonesOf(milestones, viewing.id).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
              ) : (
                <ul className="space-y-1">
                  {milestonesOf(milestones, viewing.id)
                    .slice(0, 4)
                    .map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          {m.emoji} {m.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(m.achievedOn)}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DetailDialog>

      {/* Move class */}
      <FormDialog
        open={!!moving}
        onOpenChange={(o) => !o && setMoving(null)}
        title={moving ? `Move ${moving.firstName}` : ""}
        description="Reassign the child to another classroom. Parents keep camera access to the new room only."
        submitLabel="Move"
        onSubmit={() => {
          if (!moving) return false;
          const target = classrooms.find((c) => c.id === moveTarget);
          patchItem("students", moving.id, {
            classroomId: moveTarget || null,
            programSlug: target?.programSlug ?? moving.programSlug,
            branchId: target?.branchId ?? moving.branchId,
          });
          logAudit({
            actorName: session.name,
            actorRole: session.role,
            action: "student.move",
            target: studentName(moving),
            detail: `→ ${target?.name ?? "unassigned"}`,
            ip: "local",
          });
          toast.success(`${moving.firstName} moved to ${target?.name ?? "no class"}`);
          setMoving(null);
          return true;
        }}
        size="sm"
      >
        <SelectField
          label="New classroom"
          value={moveTarget}
          onChange={setMoveTarget}
          options={classrooms.map((c) => ({ value: c.id, label: `${c.name} · ${c.room}` }))}
          placeholder="— unassigned —"
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting ? studentName(deleting) : ""}?`}
        description="This removes the child's record from the demo dataset. Attendance and invoice history stay behind."
        confirmLabel="Delete student"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("students", deleting.id);
          toast.success(`${deleting.firstName} deleted`);
          setDeleting(null);
        }}
      />
    </div>
  );
}
