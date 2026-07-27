"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Lock, ShieldCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { SectionCard, InfoItem } from "@/frontend/components/ui/Bits";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField } from "@/frontend/components/ui/Field";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { Staff } from "@/shared/types/school.types";
import { titleCase } from "@/shared/utils/common.util";

const PERMISSION_LABELS: Record<string, string> = {
  "cctv:view": "Watch permitted live cameras",
  "cctv:manage": "Add cameras, map classrooms, kill-switch",
  "cctv:audit": "Read the CCTV access log",
  "student:manage": "Enrol / edit / move students",
  "user:manage": "Create staff and assign roles",
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export function RolesManager() {
  const session = useSession();
  const definitions = useErpStore((s) => s.roleDefinitions);
  const staff = useErpStore((s) => s.staff);
  const guardians = useErpStore((s) => s.guardians);
  const branches = useErpStore((s) => s.branches);
  const patchItem = useErpStore((s) => s.patchItem);
  const setRolePermissions = useErpStore((s) => s.setRolePermissions);
  const logAudit = useErpStore((s) => s.logAudit);

  const [assigning, setAssigning] = useState<Staff | null>(null);
  const [newRole, setNewRole] = useState<Role>(ROLES.TEACHER);

  // Live counts beat the fixture numbers once staff are added in-session.
  const counts: Record<Role, number> = {
    SUPER_ADMIN: staff.filter((s) => s.role === ROLES.SUPER_ADMIN).length,
    ADMIN: staff.filter((s) => s.role === ROLES.ADMIN).length,
    TEACHER: staff.filter((s) => s.role === ROLES.TEACHER).length,
    PARENT: guardians.length,
  };

  function togglePermission(role: Role, permission: string) {
    const def = definitions.find((d) => d.role === role);
    if (!def) return;
    if (role === ROLES.SUPER_ADMIN) {
      toast.error("Super Admin always has every permission");
      return;
    }
    const had = def.permissions.includes(permission);
    setRolePermissions(role, had ? def.permissions.filter((p) => p !== permission) : [...def.permissions, permission]);
    logAudit({
      actorName: session.name,
      actorRole: session.role,
      action: "role.permission",
      target: titleCase(role),
      detail: `${had ? "revoked" : "granted"} ${permission}`,
      ip: "local",
    });
    toast.success(`${PERMISSION_LABELS[permission] ?? permission} ${had ? "revoked" : "granted"}`);
  }

  const columns: Column<Staff>[] = [
    {
      key: "name",
      header: "User",
      sortValue: (s) => s.name,
      cell: (s) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{s.name}</p>
          <p className="truncate text-xs text-muted-foreground">{s.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Role", sortValue: (s) => s.role, cell: (s) => <Badge variant="outline">{titleCase(s.role)}</Badge> },
    { key: "designation", header: "Designation", hideOnMobile: true, sortValue: (s) => s.designation, cell: (s) => s.designation },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles &amp; permissions"
        description="RBAC is enforced server-side in the service layer — this screen edits the matrix that gets checked."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Roles" }]}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {definitions.map((def) => (
          <SectionCard
            key={def.role}
            title={def.label}
            description={def.description}
            icon={<ShieldCheck className="h-4 w-4 text-ck-navy" />}
            action={
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">{counts[def.role]} users</Badge>
                {def.system && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-2.5 w-2.5" /> system
                  </Badge>
                )}
              </div>
            }
          >
            <ul className="space-y-2">
              {ALL_PERMISSIONS.map((perm) => {
                const on = def.permissions.includes(perm);
                return (
                  <li key={perm} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{PERMISSION_LABELS[perm] ?? perm}</p>
                      <code className="text-[10px] text-muted-foreground">{perm}</code>
                    </div>
                    <Switch
                      checked={on}
                      onCheckedChange={() => togglePermission(def.role, perm)}
                      disabled={def.role === ROLES.SUPER_ADMIN}
                      aria-label={`${perm} for ${def.label}`}
                    />
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        title="Role assignments"
        description="Change a staff member's role. Parent accounts are provisioned automatically at enrolment."
        icon={<UserCog className="h-4 w-4" />}
      >
        <DataTable
          rows={staff}
          columns={columns}
          rowId={(s) => s.id}
          searchable={(s) => `${s.name} ${s.email} ${s.role}`}
          searchPlaceholder="Search users…"
          pageSize={8}
          dense
          rowActions={(s) => [
            {
              label: "Change role",
              icon: <ShieldCheck />,
              onSelect: () => {
                setAssigning(s);
                setNewRole(s.role);
              },
            },
            {
              label: "Send password reset",
              icon: <KeyRound />,
              onSelect: () => toast.success(`Reset link sent to ${s.email}`),
            },
          ]}
          emptyTitle="No staff accounts"
        />
      </SectionCard>

      <FormDialog
        open={!!assigning}
        onOpenChange={(o) => !o && setAssigning(null)}
        title={assigning ? `Change role — ${assigning.name}` : ""}
        submitLabel="Assign role"
        onSubmit={() => {
          if (!assigning) return false;
          patchItem("staff", assigning.id, { role: newRole });
          logAudit({
            actorName: session.name,
            actorRole: session.role,
            action: "role.assign",
            target: assigning.email,
            detail: `${assigning.role} → ${newRole}`,
            ip: "local",
          });
          toast.success(`${assigning.name} is now ${titleCase(newRole)}`);
          setAssigning(null);
          return true;
        }}
        size="sm"
      >
        {assigning && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
              <InfoItem label="Current role" value={titleCase(assigning.role)} />
              <InfoItem label="Branch" value={branches.find((b) => b.id === assigning.branchId)?.name ?? "—"} />
            </div>
            <SelectField
              label="New role"
              value={newRole}
              onChange={(v) => setNewRole(v as Role)}
              options={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER].map((r) => ({ value: r, label: titleCase(r) }))}
              hint="Super Admin can see every branch and edit the permission matrix."
            />
          </>
        )}
      </FormDialog>
    </div>
  );
}
