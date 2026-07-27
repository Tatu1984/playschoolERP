"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, KeyRound, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useBranchScope } from "@/frontend/hooks/useSelection";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { ConfirmDialog, DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField } from "@/frontend/components/ui/Field";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { EmojiAvatar, InfoItem } from "@/frontend/components/ui/Bits";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { ALL_ROLES, ROLES, type Role } from "@/shared/constants/roles";
import type { Staff } from "@/shared/types/school.types";
import { dateKey, nowIso } from "@/shared/utils/date.util";
import { newId, formatMoney, titleCase } from "@/shared/utils/common.util";
import { formatDate } from "@/frontend/utils/formatters";

interface Draft {
  name: string;
  email: string;
  phone: string;
  role: Role;
  designation: string;
  qualification: string;
  branchId: string;
  joinedOn: string;
  salary: string;
  status: Staff["status"];
  classroomIds: string[];
}

const EMPTY: Draft = {
  name: "",
  email: "",
  phone: "",
  role: ROLES.TEACHER,
  designation: "",
  qualification: "",
  branchId: "br_kathgola",
  joinedOn: dateKey(),
  salary: "30000",
  status: "ACTIVE",
  classroomIds: [],
};

export function StaffManager() {
  const { branches, inScope } = useBranchScope();
  const staff = useErpStore((s) => s.staff);
  const classrooms = useErpStore((s) => s.classrooms);
  const students = useErpStore((s) => s.students);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState<Staff | null>(null);

  const rows = inScope(staff);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function openCreate() {
    setEditing(null);
    setDraft(EMPTY);
    setFormOpen(true);
  }

  function openEdit(member: Staff) {
    setEditing(member);
    setDraft({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      designation: member.designation,
      qualification: member.qualification,
      branchId: member.branchId,
      joinedOn: dateKey(member.joinedOn),
      salary: `${member.salary}`,
      status: member.status,
      classroomIds: member.classroomIds,
    });
    setFormOpen(true);
  }

  function save(): boolean {
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error("Name and email are required");
      return false;
    }
    const payload = {
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      phone: draft.phone,
      role: draft.role,
      designation: draft.designation,
      qualification: draft.qualification,
      branchId: draft.branchId,
      joinedOn: new Date(draft.joinedOn).toISOString(),
      status: draft.status,
      salary: Number(draft.salary) || 0,
      classroomIds: draft.classroomIds,
    };
    if (editing) {
      patchItem("staff", editing.id, payload);
      toast.success(`${payload.name} updated`);
    } else {
      addItem("staff", {
        id: newId("st"),
        ...payload,
        photoEmoji: draft.role === ROLES.TEACHER ? "👩‍🏫" : "🧑‍💼",
        createdAt: nowIso(),
      });
      toast.success(`${payload.name} added to staff`);
    }
    return true;
  }

  const columns: Column<Staff>[] = [
    {
      key: "name",
      header: "Member",
      sortValue: (s) => s.name,
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <EmojiAvatar emoji={s.photoEmoji} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{s.name}</p>
            <p className="truncate text-xs text-muted-foreground">{s.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (s) => s.role,
      cell: (s) => (
        <div>
          <Badge variant={s.role === ROLES.TEACHER ? "secondary" : "outline"}>{titleCase(s.role)}</Badge>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.designation}</p>
        </div>
      ),
    },
    {
      key: "classes",
      header: "Classes",
      hideOnMobile: true,
      sortValue: (s) => s.classroomIds.length,
      cell: (s) =>
        s.classroomIds.length ? (
          <span className="text-sm">
            {s.classroomIds.map((id) => classrooms.find((c) => c.id === id)?.name ?? "—").join(", ")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "branch",
      header: "Branch",
      hideOnMobile: true,
      sortValue: (s) => branches.find((b) => b.id === s.branchId)?.name ?? "",
      cell: (s) => <span className="text-sm">{branches.find((b) => b.id === s.branchId)?.code ?? "—"}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      hideOnMobile: true,
      sortValue: (s) => s.joinedOn,
      cell: (s) => <span className="text-sm">{formatDate(s.joinedOn)}</span>,
    },
    { key: "status", header: "Status", sortValue: (s) => s.status, cell: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff"
        description="Teachers, caregivers and admin staff — with role, branch and class assignment."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Staff" }]}
        actions={
          <Button onClick={openCreate}>
            <Plus /> Add staff
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total staff" value={rows.length} icon={<UserCog className="h-4 w-4" />} accent="navy" />
        <KpiCard label="Teachers" value={rows.filter((s) => s.role === ROLES.TEACHER).length} accent="blue" />
        <KpiCard label="On leave" value={rows.filter((s) => s.status === "ON_LEAVE").length} accent="orange" />
        <KpiCard
          label="Child : staff"
          value={`${Math.max(1, Math.round(students.length / Math.max(1, rows.filter((s) => s.role === ROLES.TEACHER).length)))}:1`}
          accent="green"
          sub="ratio"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowId={(s) => s.id}
        searchable={(s) => `${s.name} ${s.email} ${s.designation} ${s.qualification}`}
        searchPlaceholder="Search staff…"
        exportName="staff"
        onRowClick={setViewing}
        filters={[
          {
            key: "role",
            label: "Role",
            options: ALL_ROLES.filter((r) => r !== ROLES.PARENT).map((r) => ({ value: r, label: titleCase(r) })),
            predicate: (s, v) => s.role === v,
          },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "ON_LEAVE", label: "On leave" },
              { value: "RESIGNED", label: "Resigned" },
            ],
            predicate: (s, v) => s.status === v,
          },
        ]}
        rowActions={(s) => [
          { label: "View profile", icon: <Eye />, onSelect: () => setViewing(s) },
          { label: "Edit", icon: <Pencil />, onSelect: () => openEdit(s) },
          {
            label: "Send password reset",
            icon: <KeyRound />,
            onSelect: () => toast.success(`Reset link sent to ${s.email}`),
          },
          {
            label: s.status === "ACTIVE" ? "Mark on leave" : "Mark active",
            separatorBefore: true,
            onSelect: () => {
              patchItem("staff", s.id, { status: s.status === "ACTIVE" ? "ON_LEAVE" : "ACTIVE" });
              toast.success(`${s.name} updated`);
            },
          },
          { label: "Remove", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(s) },
        ]}
        emptyTitle="No staff yet"
        emptyEmoji="👩‍🏫"
        emptyAction={<Button onClick={openCreate}>Add staff</Button>}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.name}` : "Add a staff member"}
        submitLabel={editing ? "Save" : "Add"}
        onSubmit={save}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Full name" required value={draft.name} onChange={(v) => set("name", v)} />
          <TextField label="Email" required type="email" value={draft.email} onChange={(v) => set("email", v)} />
          <TextField label="Phone" type="tel" value={draft.phone} onChange={(v) => set("phone", v)} />
          <SelectField
            label="Role"
            value={draft.role}
            onChange={(v) => set("role", v as Role)}
            options={ALL_ROLES.filter((r) => r !== ROLES.PARENT).map((r) => ({ value: r, label: titleCase(r) }))}
          />
          <TextField label="Designation" value={draft.designation} onChange={(v) => set("designation", v)} placeholder="Class Teacher — Nursery" />
          <TextField label="Qualification" value={draft.qualification} onChange={(v) => set("qualification", v)} placeholder="B.Ed, NTT" />
          <SelectField
            label="Branch"
            value={draft.branchId}
            onChange={(v) => set("branchId", v)}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
          <TextField label="Joined on" type="date" value={draft.joinedOn} onChange={(v) => set("joinedOn", v)} />
          <TextField label="Monthly salary (₹)" type="number" value={draft.salary} onChange={(v) => set("salary", v)} />
          <SelectField
            label="Status"
            value={draft.status}
            onChange={(v) => set("status", v as Staff["status"])}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "ON_LEAVE", label: "On leave" },
              { value: "RESIGNED", label: "Resigned" },
            ]}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Assigned classes</p>
          <div className="flex flex-wrap gap-1.5">
            {classrooms
              .filter((c) => c.branchId === draft.branchId)
              .map((c) => {
                const on = draft.classroomIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      set(
                        "classroomIds",
                        on ? draft.classroomIds.filter((id) => id !== c.id) : [...draft.classroomIds, c.id],
                      )
                    }
                    className={
                      on
                        ? "rounded-lg bg-ck-red px-2.5 py-1 text-xs font-semibold text-white"
                        : "rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                    }
                  >
                    {c.name}
                  </button>
                );
              })}
          </div>
        </div>
      </FormDialog>

      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.name ?? ""}
        description={viewing?.designation}
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
          <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
            <InfoItem label="Role" value={titleCase(viewing.role)} />
            <InfoItem label="Status" value={<StatusBadge status={viewing.status} />} />
            <InfoItem label="Email" value={viewing.email} />
            <InfoItem label="Phone" value={viewing.phone} />
            <InfoItem label="Qualification" value={viewing.qualification || "—"} />
            <InfoItem label="Joined" value={formatDate(viewing.joinedOn)} />
            <InfoItem label="Branch" value={branches.find((b) => b.id === viewing.branchId)?.name ?? "—"} />
            <InfoItem label="Salary" value={formatMoney(viewing.salary)} />
            <InfoItem
              label="Classes"
              value={
                viewing.classroomIds.length
                  ? viewing.classroomIds.map((id) => classrooms.find((c) => c.id === id)?.name).join(", ")
                  : "—"
              }
              className="col-span-2"
            />
          </div>
        )}
      </DetailDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Remove ${deleting?.name}?`}
        description="They will lose portal access immediately."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("staff", deleting.id);
          toast.success(`${deleting.name} removed`);
          setDeleting(null);
        }}
      />
    </div>
  );
}
