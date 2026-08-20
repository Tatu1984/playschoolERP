"use client";

import { toast } from "sonner";
import { Download, ScrollText, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import type { AuditEntry } from "@/shared/types/ops.types";
import { titleCase } from "@/shared/utils/common.util";
import { formatDateTime } from "@/frontend/utils/formatters";

export interface CctvLogRow {
  id: string;
  userName: string;
  userRole: string;
  cameraName: string;
  action: string;
  reason: string | null;
  createdAt: string;
}

const CCTV_TONE: Record<string, "success" | "danger" | "info" | "neutral"> = {
  AUTHORIZE_GRANTED: "success",
  AUTHORIZE_DENIED: "danger",
  TOKEN_ISSUED: "info",
  VIEW_START: "success",
};

export function AuditLogView({ cctvRows, live }: { cctvRows: CctvLogRow[]; live: boolean }) {
  const entries = useErpStore((s) => s.auditEntries);

  const adminColumns: Column<AuditEntry>[] = [
    { key: "time", header: "Time", sortValue: (a) => a.createdAt, cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(a.createdAt)}</span> },
    {
      key: "actor",
      header: "Who",
      sortValue: (a) => a.actorName,
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{a.actorName}</p>
          <p className="truncate text-xs text-muted-foreground">{titleCase(a.actorRole)}</p>
        </div>
      ),
    },
    { key: "action", header: "Action", sortValue: (a) => a.action, cell: (a) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{a.action}</code> },
    { key: "target", header: "Target", hideOnMobile: true, sortValue: (a) => a.target, cell: (a) => <span className="text-sm">{a.target}</span> },
    { key: "detail", header: "Detail", hideOnMobile: true, sortValue: (a) => a.detail, cell: (a) => <span className="text-sm text-muted-foreground">{a.detail}</span> },
    { key: "ip", header: "IP", hideOnMobile: true, sortValue: (a) => a.ip, cell: (a) => <code className="text-xs text-muted-foreground">{a.ip}</code> },
  ];

  const cctvColumns: Column<CctvLogRow>[] = [
    { key: "time", header: "Time", sortValue: (r) => r.createdAt, cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt)}</span> },
    { key: "user", header: "User", sortValue: (r) => r.userName, cell: (r) => <span className="font-medium">{r.userName}</span> },
    { key: "role", header: "Role", hideOnMobile: true, sortValue: (r) => r.userRole, cell: (r) => titleCase(r.userRole) },
    { key: "camera", header: "Camera", sortValue: (r) => r.cameraName, cell: (r) => <span className="text-sm">{r.cameraName}</span> },
    {
      key: "action",
      header: "Event",
      sortValue: (r) => r.action,
      cell: (r) => (
        <StatusBadge
          status={r.action}
          tone={CCTV_TONE[r.action] ?? "neutral"}
          label={r.action.replace("AUTHORIZE_", "").replace("_", " ").toLowerCase()}
        />
      ),
    },
    { key: "reason", header: "Reason", hideOnMobile: true, sortValue: (r) => r.reason ?? "", cell: (r) => <span className="text-sm text-muted-foreground">{r.reason ?? "—"}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="Every sensitive action is recorded — admin changes here, camera access on the CCTV tab."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit" }]}
        actions={
          <Button variant="outline" onClick={() => toast.success("Audit export queued")}>
            <Download /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Admin actions" value={entries.length} accent="navy" icon={<ScrollText className="h-4 w-4" />} />
        <KpiCard label="CCTV events" value={cctvRows.length} accent="blue" />
        <KpiCard
          label="Access denied"
          value={cctvRows.filter((r) => r.action === "AUTHORIZE_DENIED").length}
          accent={cctvRows.some((r) => r.action === "AUTHORIZE_DENIED") ? "orange" : "muted"}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <KpiCard label="Database" value={live ? "Connected" : "Offline"} accent={live ? "green" : "muted"} />
      </div>

      <Tabs defaultValue="admin">
        <TabsList>
          <TabsTrigger value="admin">Admin actions ({entries.length})</TabsTrigger>
          <TabsTrigger value="cctv">CCTV access ({cctvRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="pt-4">
          <DataTable
            rows={entries}
            columns={adminColumns}
            rowId={(a) => a.id}
            searchable={(a) => `${a.actorName} ${a.action} ${a.target} ${a.detail}`}
            searchPlaceholder="Search actions…"
            exportName="admin-audit"
            pageSize={15}
            dense
            emptyTitle="No admin actions recorded"
            emptyDescription="Enrol a student or change a setting and it will appear here."
            emptyEmoji="📜"
          />
        </TabsContent>

        <TabsContent value="cctv" className="pt-4">
          <DataTable
            rows={cctvRows}
            columns={cctvColumns}
            rowId={(r) => r.id}
            searchable={(r) => `${r.userName} ${r.cameraName} ${r.action} ${r.reason ?? ""}`}
            searchPlaceholder="Search CCTV events…"
            exportName="cctv-audit"
            pageSize={15}
            dense
            filters={[
              {
                key: "action",
                label: "Event",
                options: Object.keys(CCTV_TONE).map((a) => ({ value: a, label: titleCase(a) })),
                predicate: (r, v) => r.action === v,
              },
            ]}
            emptyTitle={live ? "No camera activity yet" : "Database offline"}
            emptyDescription={
              live
                ? "Watch a camera from the parent portal and the decision trail shows up here."
                : "Start Postgres to read the CCTV access log."
            }
            emptyEmoji="🎥"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
