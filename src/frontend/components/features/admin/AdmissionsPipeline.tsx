"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ClipboardList,
  Eye,
  FileCheck2,
  Phone,
  Plus,
  StickyNote,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useBranchScope } from "@/frontend/hooks/useSelection";
import { INQUIRY_STAGES, conversionRate, inquiriesByStage } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { ConfirmDialog, DetailDialog, DetailRow, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { Timeline } from "@/frontend/components/ui/Bits";
import { CATALOGUE } from "@/shared/fixtures";
import type { Application, Inquiry, VisitBooking } from "@/shared/types/engagement.types";
import type { ProgramSlug } from "@/shared/types/school.types";
import { newId, titleCase } from "@/shared/utils/common.util";
import { dateKey, nowIso } from "@/shared/utils/date.util";
import { formatDate, timeAgo } from "@/frontend/utils/formatters";

const STAGE_LABEL: Record<Inquiry["stage"], string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  VISIT_SCHEDULED: "Visit booked",
  APPLICATION: "Application",
  ENROLLED: "Enrolled",
  LOST: "Lost",
};

export function AdmissionsPipeline() {
  const session = useSession();
  const { branches, inScope } = useBranchScope();

  const inquiries = useErpStore((s) => s.inquiries);
  const applications = useErpStore((s) => s.applications);
  const visits = useErpStore((s) => s.visitBookings);
  const staff = useErpStore((s) => s.staff);
  const moveInquiry = useErpStore((s) => s.moveInquiry);
  const addNote = useErpStore((s) => s.addInquiryNote);
  const setAppStatus = useErpStore((s) => s.setApplicationStatus);
  const toggleDoc = useErpStore((s) => s.toggleApplicationDoc);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const scopedInquiries = inScope(inquiries);
  const byStage = inquiriesByStage(scopedInquiries);

  const [viewing, setViewing] = useState<Inquiry | null>(null);
  const [noteFor, setNoteFor] = useState<Inquiry | null>(null);
  const [note, setNote] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({
    parentName: "",
    email: "",
    phone: "",
    childName: "",
    childDob: "",
    programSlug: "nursery" as ProgramSlug,
    branchId: branches[0]?.id ?? "br_kathgola",
    source: "PHONE" as Inquiry["source"],
    message: "",
  });
  const [appViewing, setAppViewing] = useState<Application | null>(null);
  const [deletingInquiry, setDeletingInquiry] = useState<Inquiry | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  function createInquiry(): boolean {
    if (!draft.parentName.trim() || !draft.phone.trim()) {
      toast.error("Parent name and phone are required");
      return false;
    }
    addItem("inquiries", {
      id: newId("inq"),
      parentName: draft.parentName.trim(),
      email: draft.email,
      phone: draft.phone,
      childName: draft.childName,
      childDob: draft.childDob ? new Date(draft.childDob).toISOString() : nowIso(),
      programSlug: draft.programSlug,
      branchId: draft.branchId,
      source: draft.source,
      stage: "NEW",
      message: draft.message,
      assignedToStaffId: null,
      followUpOn: null,
      notes: [],
      createdAt: nowIso(),
    });
    toast.success("Enquiry logged");
    setDraft({ ...draft, parentName: "", email: "", phone: "", childName: "", message: "" });
    return true;
  }

  function advance(inq: Inquiry) {
    const idx = INQUIRY_STAGES.indexOf(inq.stage);
    const next = INQUIRY_STAGES[Math.min(idx + 1, INQUIRY_STAGES.length - 2)];
    moveInquiry(inq.id, next);
    toast.success(`${inq.parentName} → ${STAGE_LABEL[next]}`);
  }

  function convertToApplication(inq: Inquiry) {
    addItem("applications", {
      id: newId("app"),
      inquiryId: inq.id,
      applicationNo: `APP/2026/${300 + applications.length}`,
      childName: inq.childName || `${inq.parentName}'s child`,
      childDob: inq.childDob,
      programSlug: inq.programSlug,
      branchId: inq.branchId,
      parentName: inq.parentName,
      email: inq.email,
      phone: inq.phone,
      address: "",
      status: "SUBMITTED",
      documents: ["Birth certificate", "Aadhaar copy", "Vaccination record", "Passport photo", "Address proof"].map(
        (label, i) => ({ id: `doc_${inq.id}_${i}`, label, uploaded: false }),
      ),
      submittedOn: nowIso(),
      decisionNote: "",
      createdAt: nowIso(),
    });
    moveInquiry(inq.id, "APPLICATION");
    toast.success("Application created from enquiry");
  }

  const appColumns: Column<Application>[] = [
    {
      key: "child",
      header: "Child",
      sortValue: (a) => a.childName,
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{a.childName}</p>
          <p className="truncate text-xs text-muted-foreground">{a.applicationNo}</p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      hideOnMobile: true,
      sortValue: (a) => a.programSlug,
      cell: (a) => CATALOGUE.programs.find((p) => p.slug === a.programSlug)?.name ?? a.programSlug,
    },
    {
      key: "parent",
      header: "Parent",
      hideOnMobile: true,
      sortValue: (a) => a.parentName,
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{a.parentName}</p>
          <p className="truncate text-xs text-muted-foreground">{a.phone}</p>
        </div>
      ),
    },
    {
      key: "docs",
      header: "Documents",
      hideOnMobile: true,
      sortValue: (a) => a.documents.filter((d) => d.uploaded).length,
      cell: (a) => {
        const done = a.documents.filter((d) => d.uploaded).length;
        return (
          <span className={done === a.documents.length ? "text-emerald-600" : "text-amber-600"}>
            {done}/{a.documents.length}
          </span>
        );
      },
    },
    {
      key: "submitted",
      header: "Submitted",
      hideOnMobile: true,
      sortValue: (a) => a.submittedOn,
      cell: (a) => formatDate(a.submittedOn),
    },
    { key: "status", header: "Status", sortValue: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
  ];

  const visitColumns: Column<VisitBooking>[] = [
    {
      key: "parent",
      header: "Parent",
      sortValue: (v) => v.parentName,
      cell: (v) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{v.parentName}</p>
          <p className="truncate text-xs text-muted-foreground">{v.phone}</p>
        </div>
      ),
    },
    {
      key: "when",
      header: "When",
      sortValue: (v) => `${v.date} ${v.slot}`,
      cell: (v) => (
        <span className="text-sm">
          {formatDate(v.date)} · {v.slot}
        </span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      hideOnMobile: true,
      sortValue: (v) => v.mode,
      cell: (v) => <Badge variant="outline">{v.mode === "VIDEO" ? "Video call" : "Campus"}</Badge>,
    },
    {
      key: "branch",
      header: "Branch",
      hideOnMobile: true,
      sortValue: (v) => v.branchId,
      cell: (v) => branches.find((b) => b.id === v.branchId)?.code ?? "—",
    },
    { key: "status", header: "Status", sortValue: (v) => v.status, cell: (v) => <StatusBadge status={v.status} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admissions"
        description="Enquiries move left to right. Drag a card between columns, or use the ⋯ menu."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Admissions" }]}
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus /> Log enquiry
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Open enquiries" value={scopedInquiries.filter((i) => !["ENROLLED", "LOST"].includes(i.stage)).length} accent="blue" icon={<ClipboardList className="h-4 w-4" />} />
        <KpiCard label="Applications" value={applications.length} accent="orange" sub={`${applications.filter((a) => a.status === "DOCS_PENDING").length} awaiting docs`} />
        <KpiCard label="Visits booked" value={visits.filter((v) => v.status !== "CANCELLED").length} accent="magenta" icon={<CalendarCheck className="h-4 w-4" />} />
        <KpiCard label="Conversion" value={`${conversionRate(scopedInquiries)}%`} accent="green" sub="enquiry → enrolled" />
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="visits">Visits ({visits.length})</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ kanban */}
        <TabsContent value="pipeline" className="pt-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {INQUIRY_STAGES.map((stage) => (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging) {
                    moveInquiry(dragging, stage);
                    toast.success(`Moved to ${STAGE_LABEL[stage]}`);
                    setDragging(null);
                  }
                }}
                className="flex min-h-40 flex-col gap-2 rounded-xl border bg-card/60 p-2"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold tracking-wide uppercase">{STAGE_LABEL[stage]}</span>
                  <Badge variant="secondary">{byStage[stage].length}</Badge>
                </div>
                {byStage[stage].map((inq) => (
                  <article
                    key={inq.id}
                    draggable
                    onDragStart={() => setDragging(inq.id)}
                    onDragEnd={() => setDragging(null)}
                    className="cursor-grab rounded-lg border bg-card p-2.5 shadow-sm transition hover:border-ck-red/40 active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setViewing(inq)}>
                        <p className="truncate text-sm font-semibold">{inq.childName || inq.parentName}</p>
                        <p className="truncate text-xs text-muted-foreground">{inq.parentName}</p>
                      </button>
                      <RowActions
                        label="Enquiry"
                        actions={[
                          { label: "View details", icon: <Eye />, onSelect: () => setViewing(inq) },
                          { label: "Add note", icon: <StickyNote />, onSelect: () => { setNoteFor(inq); setNote(""); } },
                          {
                            label: "Call parent",
                            icon: <Phone />,
                            onSelect: () => toast.info(`Dialling ${inq.phone}…`),
                          },
                          ...(stage !== "ENROLLED" && stage !== "LOST"
                            ? [{ label: "Move forward", icon: <ArrowRight />, onSelect: () => advance(inq) }]
                            : []),
                          ...(stage === "CONTACTED" || stage === "VISIT_SCHEDULED"
                            ? [{ label: "Create application", icon: <FileCheck2 />, onSelect: () => convertToApplication(inq) }]
                            : []),
                          ...(stage !== "ENROLLED"
                            ? [
                                {
                                  label: "Mark enrolled",
                                  icon: <UserPlus />,
                                  separatorBefore: true,
                                  onSelect: () => {
                                    moveInquiry(inq.id, "ENROLLED");
                                    toast.success(`${inq.parentName} marked enrolled`);
                                  },
                                },
                              ]
                            : []),
                          ...(stage !== "LOST"
                            ? [
                                {
                                  label: "Mark lost",
                                  icon: <X />,
                                  onSelect: () => {
                                    moveInquiry(inq.id, "LOST");
                                    toast.success("Marked lost");
                                  },
                                },
                              ]
                            : []),
                          { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeletingInquiry(inq) },
                        ]}
                      />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {CATALOGUE.programs.find((p) => p.slug === inq.programSlug)?.name}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(inq.createdAt)}</span>
                    </div>
                  </article>
                ))}
                {byStage[stage].length === 0 && (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Drop here
                  </p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ------------------------------------------------ applications */}
        <TabsContent value="applications" className="pt-4">
          <DataTable
            rows={applications}
            columns={appColumns}
            rowId={(a) => a.id}
            searchable={(a) => `${a.childName} ${a.parentName} ${a.applicationNo} ${a.phone}`}
            searchPlaceholder="Search applications…"
            exportName="applications"
            onRowClick={setAppViewing}
            filters={[
              {
                key: "status",
                label: "Status",
                options: ["SUBMITTED", "UNDER_REVIEW", "DOCS_PENDING", "SEAT_OFFERED", "ACCEPTED", "REJECTED"].map((s) => ({
                  value: s,
                  label: titleCase(s),
                })),
                predicate: (a, v) => a.status === v,
              },
            ]}
            rowActions={(a) => [
              { label: "Open application", icon: <Eye />, onSelect: () => setAppViewing(a) },
              {
                label: "Move to review",
                onSelect: () => {
                  setAppStatus(a.id, "UNDER_REVIEW");
                  toast.success("Moved to review");
                },
              },
              {
                label: "Offer a seat",
                icon: <Check />,
                onSelect: () => {
                  setAppStatus(a.id, "SEAT_OFFERED", "Seat offered — awaiting confirmation.");
                  toast.success("Seat offered");
                },
              },
              {
                label: "Accept",
                separatorBefore: true,
                onSelect: () => {
                  setAppStatus(a.id, "ACCEPTED", "Seat confirmed.");
                  toast.success("Application accepted");
                },
              },
              {
                label: "Reject",
                destructive: true,
                onSelect: () => {
                  setAppStatus(a.id, "REJECTED", "No seat available for this intake.");
                  toast.success("Application rejected");
                },
              },
            ]}
            emptyTitle="No applications"
            emptyEmoji="📝"
          />
        </TabsContent>

        {/* ------------------------------------------------ visits */}
        <TabsContent value="visits" className="pt-4">
          <DataTable
            rows={visits}
            columns={visitColumns}
            rowId={(v) => v.id}
            searchable={(v) => `${v.parentName} ${v.phone} ${v.email}`}
            searchPlaceholder="Search visits…"
            exportName="visits"
            filters={[
              {
                key: "status",
                label: "Status",
                options: ["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => ({ value: s, label: titleCase(s) })),
                predicate: (v, val) => v.status === val,
              },
            ]}
            rowActions={(v) => [
              {
                label: "Confirm",
                icon: <Check />,
                disabled: v.status === "CONFIRMED",
                onSelect: () => {
                  patchItem("visitBookings", v.id, { status: "CONFIRMED" });
                  toast.success(`Visit confirmed for ${v.parentName}`);
                },
              },
              {
                label: "Mark completed",
                onSelect: () => {
                  patchItem("visitBookings", v.id, { status: "COMPLETED" });
                  toast.success("Visit completed");
                },
              },
              {
                label: "Call parent",
                icon: <Phone />,
                onSelect: () => toast.info(`Dialling ${v.phone}…`),
              },
              {
                label: "Cancel visit",
                destructive: true,
                separatorBefore: true,
                onSelect: () => {
                  patchItem("visitBookings", v.id, { status: "CANCELLED" });
                  toast.success("Visit cancelled");
                },
              },
            ]}
            emptyTitle="No visit bookings"
            emptyEmoji="📅"
          />
        </TabsContent>
      </Tabs>

      {/* enquiry detail */}
      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing ? `${viewing.childName || "Enquiry"} · ${viewing.parentName}` : ""}
        description={viewing ? `Logged ${timeAgo(viewing.createdAt)} from ${titleCase(viewing.source)}` : undefined}
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              {viewing.stage !== "ENROLLED" && viewing.stage !== "LOST" && (
                <Button
                  onClick={() => {
                    advance(viewing);
                    setViewing(null);
                  }}
                >
                  Move forward <ArrowRight />
                </Button>
              )}
            </>
          )
        }
      >
        {viewing && (
          <>
            <div>
              <DetailRow label="Stage">
                <StatusBadge status={viewing.stage} />
              </DetailRow>
              <DetailRow label="Parent">{viewing.parentName}</DetailRow>
              <DetailRow label="Phone">{viewing.phone}</DetailRow>
              <DetailRow label="Email">{viewing.email}</DetailRow>
              <DetailRow label="Program">
                {CATALOGUE.programs.find((p) => p.slug === viewing.programSlug)?.name}
              </DetailRow>
              <DetailRow label="Branch">{branches.find((b) => b.id === viewing.branchId)?.name}</DetailRow>
              <DetailRow label="Assigned to">
                {staff.find((s) => s.id === viewing.assignedToStaffId)?.name ?? "Unassigned"}
              </DetailRow>
              <DetailRow label="Follow up">{viewing.followUpOn ? formatDate(viewing.followUpOn) : "—"}</DetailRow>
            </div>

            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Their message</p>
              {viewing.message || "—"}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Notes</p>
                <Button size="xs" variant="outline" onClick={() => { setNoteFor(viewing); setNote(""); }}>
                  <Plus /> Note
                </Button>
              </div>
              {viewing.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <Timeline
                  items={viewing.notes.map((n) => ({
                    id: n.id,
                    icon: "📝",
                    title: n.author,
                    meta: timeAgo(n.createdAt),
                    body: n.body,
                  }))}
                />
              )}
            </div>
          </>
        )}
      </DetailDialog>

      {/* application detail */}
      <DetailDialog
        open={!!appViewing}
        onOpenChange={(o) => !o && setAppViewing(null)}
        title={appViewing?.childName ?? ""}
        description={appViewing ? `${appViewing.applicationNo} · submitted ${formatDate(appViewing.submittedOn)}` : undefined}
        footer={
          appViewing && (
            <>
              <Button variant="outline" onClick={() => setAppViewing(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setAppStatus(appViewing.id, "SEAT_OFFERED", "Seat offered — awaiting confirmation.");
                  toast.success("Seat offered");
                  setAppViewing(null);
                }}
              >
                Offer a seat
              </Button>
            </>
          )
        }
      >
        {appViewing && (
          <>
            <div>
              <DetailRow label="Status">
                <StatusBadge status={appViewing.status} />
              </DetailRow>
              <DetailRow label="Parent">{appViewing.parentName}</DetailRow>
              <DetailRow label="Contact">
                {appViewing.phone} · {appViewing.email}
              </DetailRow>
              <DetailRow label="Program">
                {CATALOGUE.programs.find((p) => p.slug === appViewing.programSlug)?.name}
              </DetailRow>
              <DetailRow label="Branch">{branches.find((b) => b.id === appViewing.branchId)?.name}</DetailRow>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Documents — tap to toggle received
              </p>
              <ul className="space-y-1">
                {appViewing.documents.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => toggleDoc(appViewing.id, doc.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border p-2 text-left text-sm transition hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={
                            doc.uploaded
                              ? "grid h-5 w-5 place-items-center rounded bg-ck-green text-white"
                              : "grid h-5 w-5 place-items-center rounded border"
                          }
                        >
                          {doc.uploaded ? "✓" : ""}
                        </span>
                        {doc.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{doc.fileName ?? "not received"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {appViewing.decisionNote && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm">
                <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Decision note</p>
                {appViewing.decisionNote}
              </div>
            )}
          </>
        )}
      </DetailDialog>

      {/* add note */}
      <FormDialog
        open={!!noteFor}
        onOpenChange={(o) => !o && setNoteFor(null)}
        title="Add a note"
        submitLabel="Save note"
        onSubmit={() => {
          if (!noteFor || !note.trim()) {
            toast.error("Write something first");
            return false;
          }
          addNote(noteFor.id, note.trim(), session.name);
          toast.success("Note added");
          setNoteFor(null);
          return true;
        }}
        size="sm"
      >
        <TextareaField label="Note" value={note} onChange={setNote} placeholder="Called and shared the brochure…" />
      </FormDialog>

      {/* new enquiry */}
      <FormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="Log an enquiry"
        description="Walk-ins and phone calls — website enquiries land here automatically."
        submitLabel="Log enquiry"
        onSubmit={createInquiry}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Parent name" required value={draft.parentName} onChange={(v) => setDraft({ ...draft, parentName: v })} />
          <TextField label="Phone" required type="tel" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
          <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
          <TextField label="Child name" value={draft.childName} onChange={(v) => setDraft({ ...draft, childName: v })} />
          <TextField label="Child date of birth" type="date" value={draft.childDob} onChange={(v) => setDraft({ ...draft, childDob: v })} max={dateKey()} />
          <SelectField
            label="Program"
            value={draft.programSlug}
            onChange={(v) => setDraft({ ...draft, programSlug: v as ProgramSlug })}
            options={CATALOGUE.programs.map((p) => ({ value: p.slug, label: p.name }))}
          />
          <SelectField
            label="Branch"
            value={draft.branchId}
            onChange={(v) => setDraft({ ...draft, branchId: v })}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
          <SelectField
            label="Source"
            value={draft.source}
            onChange={(v) => setDraft({ ...draft, source: v as Inquiry["source"] })}
            options={["WEBSITE", "WALK_IN", "REFERRAL", "PHONE", "SOCIAL", "CAMPAIGN"].map((s) => ({
              value: s,
              label: titleCase(s),
            }))}
          />
        </div>
        <TextareaField label="Message" rows={3} value={draft.message} onChange={(v) => setDraft({ ...draft, message: v })} />
      </FormDialog>

      <ConfirmDialog
        open={!!deletingInquiry}
        onOpenChange={(o) => !o && setDeletingInquiry(null)}
        title="Delete this enquiry?"
        description="The lead and its notes are removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deletingInquiry) return;
          removeItem("inquiries", deletingInquiry.id);
          toast.success("Enquiry deleted");
          setDeletingInquiry(null);
        }}
      />
    </div>
  );
}
