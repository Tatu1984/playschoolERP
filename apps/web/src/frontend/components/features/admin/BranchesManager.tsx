"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, DoorOpen, Pencil, Plus, Power, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useErpStore } from "@/frontend/store/erpStore";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { SectionCard, InfoItem } from "@/frontend/components/ui/Bits";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { ConfirmDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField } from "@/frontend/components/ui/Field";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { CATALOGUE } from "@/shared/fixtures";
import type { Branch, Classroom, ProgramSlug } from "@/shared/types/school.types";
import { newId } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";

interface BranchDraft {
  name: string;
  code: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  opensAt: string;
  closesAt: string;
  capacity: string;
}

interface ClassDraft {
  name: string;
  branchId: string;
  programSlug: ProgramSlug;
  capacity: string;
  room: string;
  teacherId: string;
}

const EMPTY_BRANCH: BranchDraft = {
  name: "",
  code: "",
  address: "",
  city: "Kolkata",
  pincode: "",
  phone: "",
  email: "",
  opensAt: "08:00",
  closesAt: "18:30",
  capacity: "80",
};

export function BranchesManager() {
  const branches = useErpStore((s) => s.branches);
  const classrooms = useErpStore((s) => s.classrooms);
  const students = useErpStore((s) => s.students);
  const staff = useErpStore((s) => s.staff);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const [branchDraft, setBranchDraft] = useState<BranchDraft>(EMPTY_BRANCH);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  const [classDraft, setClassDraft] = useState<ClassDraft | null>(null);
  const [editingClass, setEditingClass] = useState<Classroom | null>(null);
  const [deletingClass, setDeletingClass] = useState<Classroom | null>(null);

  function openBranchCreate() {
    setEditingBranch(null);
    setBranchDraft(EMPTY_BRANCH);
    setBranchFormOpen(true);
  }

  function openBranchEdit(b: Branch) {
    setEditingBranch(b);
    setBranchDraft({
      name: b.name,
      code: b.code,
      address: b.address,
      city: b.city,
      pincode: b.pincode,
      phone: b.phone,
      email: b.email,
      opensAt: b.opensAt,
      closesAt: b.closesAt,
      capacity: `${b.capacity}`,
    });
    setBranchFormOpen(true);
  }

  function saveBranch(): boolean {
    if (!branchDraft.name.trim()) {
      toast.error("Branch name is required");
      return false;
    }
    const payload = {
      name: branchDraft.name.trim(),
      code: branchDraft.code.trim() || branchDraft.name.slice(0, 3).toUpperCase(),
      address: branchDraft.address,
      city: branchDraft.city,
      pincode: branchDraft.pincode,
      phone: branchDraft.phone,
      email: branchDraft.email,
      opensAt: branchDraft.opensAt,
      closesAt: branchDraft.closesAt,
      capacity: Number(branchDraft.capacity) || 0,
    };
    if (editingBranch) {
      patchItem("branches", editingBranch.id, payload);
      toast.success("Branch updated");
    } else {
      addItem("branches", { id: newId("br"), active: true, createdAt: nowIso(), ...payload });
      toast.success("Branch created");
    }
    return true;
  }

  function saveClass(): boolean {
    if (!classDraft || !classDraft.name.trim()) {
      toast.error("Classroom name is required");
      return false;
    }
    const payload = {
      name: classDraft.name.trim(),
      branchId: classDraft.branchId,
      programSlug: classDraft.programSlug,
      capacity: Number(classDraft.capacity) || 0,
      room: classDraft.room,
      teacherId: classDraft.teacherId || null,
    };
    if (editingClass) {
      patchItem("classrooms", editingClass.id, payload);
      toast.success("Classroom updated");
    } else {
      addItem("classrooms", { id: newId("cr"), createdAt: nowIso(), ...payload });
      toast.success("Classroom added");
    }
    setClassDraft(null);
    setEditingClass(null);
    return true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Branches &amp; classrooms"
        description="Each branch has its own school hours, capacity and classrooms. Camera and data access are branch-scoped."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Branches" }]}
        actions={
          <Button onClick={openBranchCreate}>
            <Plus /> Add branch
          </Button>
        }
      />

      {branches.length === 0 ? (
        <EmptyState
          emoji="🏫"
          title="No branches"
          description="Create your first branch to start enrolling children."
          action={<Button onClick={openBranchCreate}>Add branch</Button>}
        />
      ) : (
        <div className="space-y-4">
          {branches.map((branch) => {
            const rooms = classrooms.filter((c) => c.branchId === branch.id);
            const enrolled = students.filter((s) => s.branchId === branch.id && s.status === "ACTIVE").length;
            const fill = branch.capacity ? Math.round((enrolled / branch.capacity) * 100) : 0;
            return (
              <SectionCard
                key={branch.id}
                title={branch.name}
                icon={<Building2 className="h-4 w-4 text-ck-navy" />}
                description={`${branch.address}, ${branch.city} ${branch.pincode}`}
                action={
                  <div className="flex items-center gap-1.5">
                    {branch.active ? (
                      <Badge variant="secondary">{branch.code}</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                    <RowActions
                      label="Branch actions"
                      actions={[
                        { label: "Edit branch", icon: <Pencil />, onSelect: () => openBranchEdit(branch) },
                        {
                          label: "Add classroom",
                          icon: <DoorOpen />,
                          onSelect: () =>
                            setClassDraft({
                              name: "",
                              branchId: branch.id,
                              programSlug: "nursery",
                              capacity: "16",
                              room: "",
                              teacherId: "",
                            }),
                        },
                        {
                          label: branch.active ? "Deactivate" : "Activate",
                          icon: <Power />,
                          separatorBefore: true,
                          onSelect: () => {
                            patchItem("branches", branch.id, { active: !branch.active });
                            toast.success(`${branch.name} ${branch.active ? "deactivated" : "activated"}`);
                          },
                        },
                        {
                          label: "Delete branch",
                          icon: <Trash2 />,
                          destructive: true,
                          onSelect: () => setDeletingBranch(branch),
                        },
                      ]}
                    />
                  </div>
                }
              >
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoItem label="School hours" value={`${branch.opensAt}–${branch.closesAt}`} />
                      <InfoItem label="Phone" value={branch.phone || "—"} />
                      <InfoItem label="Email" value={branch.email || "—"} className="col-span-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">Capacity</span>
                        <span className="tabular-nums text-muted-foreground">
                          {enrolled}/{branch.capacity}
                        </span>
                      </div>
                      <Progress value={fill} className="mt-1.5" />
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {staff.filter((s) => s.branchId === branch.id).length} staff
                      </span>
                      <span className="flex items-center gap-1">
                        <DoorOpen className="h-3.5 w-3.5" /> {rooms.length} rooms
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Classrooms</p>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          setClassDraft({
                            name: "",
                            branchId: branch.id,
                            programSlug: "nursery",
                            capacity: "16",
                            room: "",
                            teacherId: "",
                          })
                        }
                      >
                        <Plus /> Classroom
                      </Button>
                    </div>
                    {rooms.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        No classrooms yet.
                      </p>
                    ) : (
                      <ul className="divide-y rounded-lg border">
                        {rooms.map((room) => {
                          const teacher = staff.find((s) => s.id === room.teacherId);
                          const count = students.filter((s) => s.classroomId === room.id).length;
                          return (
                            <li key={room.id} className="flex items-center justify-between gap-3 p-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{room.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {CATALOGUE.programs.find((p) => p.slug === room.programSlug)?.name} ·{" "}
                                  {teacher?.name ?? "No teacher"} · {room.room || "—"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge variant={count > room.capacity ? "destructive" : "outline"}>
                                  {count}/{room.capacity}
                                </Badge>
                                <RowActions
                                  label="Classroom actions"
                                  actions={[
                                    {
                                      label: "Edit classroom",
                                      icon: <Pencil />,
                                      onSelect: () => {
                                        setEditingClass(room);
                                        setClassDraft({
                                          name: room.name,
                                          branchId: room.branchId,
                                          programSlug: room.programSlug,
                                          capacity: `${room.capacity}`,
                                          room: room.room,
                                          teacherId: room.teacherId ?? "",
                                        });
                                      },
                                    },
                                    {
                                      label: "Delete",
                                      icon: <Trash2 />,
                                      destructive: true,
                                      onSelect: () => setDeletingClass(room),
                                    },
                                  ]}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      <FormDialog
        open={branchFormOpen}
        onOpenChange={setBranchFormOpen}
        title={editingBranch ? `Edit ${editingBranch.name}` : "Add a branch"}
        submitLabel={editingBranch ? "Save" : "Create"}
        onSubmit={saveBranch}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Branch name" required value={branchDraft.name} onChange={(v) => setBranchDraft((d) => ({ ...d, name: v }))} />
          <TextField label="Code" value={branchDraft.code} onChange={(v) => setBranchDraft((d) => ({ ...d, code: v }))} placeholder="CK-KTG" />
          <TextField label="Address" value={branchDraft.address} onChange={(v) => setBranchDraft((d) => ({ ...d, address: v }))} className="sm:col-span-2" />
          <TextField label="City" value={branchDraft.city} onChange={(v) => setBranchDraft((d) => ({ ...d, city: v }))} />
          <TextField label="Pincode" value={branchDraft.pincode} onChange={(v) => setBranchDraft((d) => ({ ...d, pincode: v }))} />
          <TextField label="Phone" type="tel" value={branchDraft.phone} onChange={(v) => setBranchDraft((d) => ({ ...d, phone: v }))} />
          <TextField label="Email" type="email" value={branchDraft.email} onChange={(v) => setBranchDraft((d) => ({ ...d, email: v }))} />
          <TextField label="Opens at" type="time" value={branchDraft.opensAt} onChange={(v) => setBranchDraft((d) => ({ ...d, opensAt: v }))} hint="Live camera window starts here" />
          <TextField label="Closes at" type="time" value={branchDraft.closesAt} onChange={(v) => setBranchDraft((d) => ({ ...d, closesAt: v }))} />
          <TextField label="Capacity" type="number" value={branchDraft.capacity} onChange={(v) => setBranchDraft((d) => ({ ...d, capacity: v }))} />
        </div>
      </FormDialog>

      <FormDialog
        open={!!classDraft}
        onOpenChange={(o) => {
          if (!o) {
            setClassDraft(null);
            setEditingClass(null);
          }
        }}
        title={editingClass ? `Edit ${editingClass.name}` : "Add a classroom"}
        submitLabel={editingClass ? "Save" : "Add"}
        onSubmit={saveClass}
      >
        {classDraft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Name" required value={classDraft.name} onChange={(v) => setClassDraft({ ...classDraft, name: v })} placeholder="Sunshine" />
            <SelectField
              label="Program"
              value={classDraft.programSlug}
              onChange={(v) => setClassDraft({ ...classDraft, programSlug: v as ProgramSlug })}
              options={CATALOGUE.programs.map((p) => ({ value: p.slug, label: p.name }))}
            />
            <SelectField
              label="Branch"
              value={classDraft.branchId}
              onChange={(v) => setClassDraft({ ...classDraft, branchId: v })}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <SelectField
              label="Class teacher"
              value={classDraft.teacherId}
              onChange={(v) => setClassDraft({ ...classDraft, teacherId: v })}
              options={staff
                .filter((s) => s.branchId === classDraft.branchId)
                .map((s) => ({ value: s.id, label: s.name }))}
              placeholder="— none —"
            />
            <TextField label="Capacity" type="number" value={classDraft.capacity} onChange={(v) => setClassDraft({ ...classDraft, capacity: v })} />
            <TextField label="Room" value={classDraft.room} onChange={(v) => setClassDraft({ ...classDraft, room: v })} placeholder="First floor · Room 3" />
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deletingBranch}
        onOpenChange={(o) => !o && setDeletingBranch(null)}
        title={`Delete ${deletingBranch?.name}?`}
        description="Classrooms in this branch stay in the dataset but become orphaned. Deactivating is usually safer."
        confirmLabel="Delete branch"
        onConfirm={() => {
          if (!deletingBranch) return;
          removeItem("branches", deletingBranch.id);
          toast.success("Branch deleted");
          setDeletingBranch(null);
        }}
      />

      <ConfirmDialog
        open={!!deletingClass}
        onOpenChange={(o) => !o && setDeletingClass(null)}
        title={`Delete ${deletingClass?.name}?`}
        description="Children in this classroom will show as unassigned."
        confirmLabel="Delete classroom"
        onConfirm={() => {
          if (!deletingClass) return;
          students
            .filter((s) => s.classroomId === deletingClass.id)
            .forEach((s) => patchItem("students", s.id, { classroomId: null }));
          removeItem("classrooms", deletingClass.id);
          toast.success("Classroom deleted");
          setDeletingClass(null);
        }}
      />
    </div>
  );
}
