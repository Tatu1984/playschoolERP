"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Award, Eye, LineChart, Pencil, Plus, Send, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useStaffId } from "@/frontend/store/session";
import { useSelectedClass } from "@/frontend/hooks/useSelection";
import { milestonesOf, rosterOf, skillSeries, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { ListField, SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { SkillBars } from "@/frontend/components/ui/Charts";
import { EmojiAvatar, Timeline } from "@/frontend/components/ui/Bits";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { SKILL_LABELS, type ProgressReport, type SkillKey } from "@/shared/types/learning.types";
import { newId } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { formatDate } from "@/frontend/utils/formatters";

const SKILLS: SkillKey[] = ["cognitive", "language", "motor", "social", "emotional", "creative"];
const TERMS = ["Term 1 · 2026-27", "Term 2 · 2026-27", "Term 3 · 2026-27"];

export function ReportsEditor() {
  const staffId = useStaffId();
  const { classroom } = useSelectedClass();
  const students = useErpStore((s) => s.students);
  const reports = useErpStore((s) => s.progressReports);
  const milestones = useErpStore((s) => s.milestones);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);

  const roster = classroom ? rosterOf(students, classroom.id) : [];
  const rosterIds = roster.map((s) => s.id);
  const classReports = reports.filter((r) => rosterIds.includes(r.studentId));

  const [editing, setEditing] = useState<ProgressReport | null>(null);
  const [viewing, setViewing] = useState<ProgressReport | null>(null);
  const [creatingFor, setCreatingFor] = useState<string>("");
  const [milestoneFor, setMilestoneFor] = useState<string>("");
  const [milestone, setMilestone] = useState({ label: "", skill: "cognitive" as SkillKey, emoji: "⭐", note: "" });

  const [draft, setDraft] = useState<ProgressReport>({
    id: "",
    studentId: "",
    term: TERMS[1],
    scores: { cognitive: 70, language: 70, motor: 70, social: 70, emotional: 70, creative: 70 },
    teacherRemark: "",
    strengths: [],
    focusAreas: [],
    attendancePct: 90,
    publishedAt: null,
    authorStaffId: staffId,
    createdAt: "",
  });

  function openCreate(studentId: string) {
    setEditing(null);
    setCreatingFor(studentId);
    setDraft({
      id: "",
      studentId,
      term: TERMS[1],
      scores: { cognitive: 70, language: 70, motor: 70, social: 70, emotional: 70, creative: 70 },
      teacherRemark: "",
      strengths: [],
      focusAreas: [],
      attendancePct: 90,
      publishedAt: null,
      authorStaffId: staffId,
      createdAt: "",
    });
  }

  function openEdit(r: ProgressReport) {
    setCreatingFor("");
    setEditing(r);
    setDraft(r);
  }

  function save(): boolean {
    if (!draft.teacherRemark.trim()) {
      toast.error("Write a remark for the parents");
      return false;
    }
    if (editing) {
      patchItem("progressReports", editing.id, draft);
      toast.success("Report saved");
    } else {
      addItem("progressReports", { ...draft, id: newId("rep"), createdAt: nowIso() });
      toast.success("Report drafted");
    }
    setEditing(null);
    setCreatingFor("");
    return true;
  }

  const columns: Column<ProgressReport>[] = [
    {
      key: "child",
      header: "Child",
      sortValue: (r) => {
        const s = students.find((x) => x.id === r.studentId);
        return s ? studentName(s) : "";
      },
      cell: (r) => {
        const s = students.find((x) => x.id === r.studentId);
        return (
          <div className="flex items-center gap-2.5">
            <EmojiAvatar emoji={s?.photoEmoji ?? "🧒"} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium">{s ? studentName(s) : "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{r.term}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "average",
      header: "Average",
      sortValue: (r) => Math.round(SKILLS.reduce((sum, k) => sum + r.scores[k], 0) / SKILLS.length),
      cell: (r) => {
        const avg = Math.round(SKILLS.reduce((sum, k) => sum + r.scores[k], 0) / SKILLS.length);
        return (
          <span className={avg >= 80 ? "font-semibold text-emerald-600" : avg >= 65 ? "font-semibold text-amber-600" : "font-semibold text-ck-red"}>
            {avg}%
          </span>
        );
      },
    },
    { key: "attendance", header: "Attendance", hideOnMobile: true, sortValue: (r) => r.attendancePct, cell: (r) => `${r.attendancePct}%` },
    {
      key: "state",
      header: "State",
      sortValue: (r) => (r.publishedAt ? "PUBLISHED" : "DRAFT"),
      cell: (r) => (r.publishedAt ? <StatusBadge status="PUBLISHED" label={`Published ${formatDate(r.publishedAt)}`} /> : <StatusBadge status="DRAFT" />),
    },
  ];

  if (!classroom) {
    return <EmptyState emoji="🏫" title="No class assigned" description="Ask an admin to assign you a classroom." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress reports"
        description={`${classroom.name} · score each skill, add a remark, then publish to parents.`}
        crumbs={[{ label: "Teacher", href: "/teacher" }, { label: "Reports" }]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Reports" value={classReports.length} accent="blue" icon={<LineChart className="h-4 w-4" />} />
        <KpiCard label="Published" value={classReports.filter((r) => r.publishedAt).length} accent="green" />
        <KpiCard label="Drafts" value={classReports.filter((r) => !r.publishedAt).length} accent="orange" />
        <KpiCard label="Milestones logged" value={rosterIds.reduce((sum, id) => sum + milestonesOf(milestones, id).length, 0)} accent="magenta" icon={<Award className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Reports ({classReports.length})</TabsTrigger>
          <TabsTrigger value="children">Children ({roster.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="pt-4">
          <DataTable
            rows={classReports}
            columns={columns}
            rowId={(r) => r.id}
            searchable={(r) => {
              const s = students.find((x) => x.id === r.studentId);
              return `${s ? studentName(s) : ""} ${r.term} ${r.teacherRemark}`;
            }}
            searchPlaceholder="Search reports…"
            onRowClick={setViewing}
            filters={[
              { key: "term", label: "Term", options: TERMS.map((t) => ({ value: t, label: t })), predicate: (r, v) => r.term === v },
              {
                key: "state",
                label: "State",
                options: [
                  { value: "published", label: "Published" },
                  { value: "draft", label: "Draft" },
                ],
                predicate: (r, v) => (v === "published" ? !!r.publishedAt : !r.publishedAt),
              },
            ]}
            rowActions={(r) => [
              { label: "Open report", icon: <Eye />, onSelect: () => setViewing(r) },
              { label: "Edit", icon: <Pencil />, onSelect: () => openEdit(r) },
              r.publishedAt
                ? {
                    label: "Unpublish",
                    icon: <Undo2 />,
                    onSelect: () => {
                      patchItem("progressReports", r.id, { publishedAt: null });
                      toast.success("Report hidden from parents");
                    },
                  }
                : {
                    label: "Publish to parents",
                    icon: <Send />,
                    onSelect: () => {
                      patchItem("progressReports", r.id, { publishedAt: nowIso() });
                      toast.success("Report published");
                    },
                  },
            ]}
            bulkActions={(ids, clear) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  ids.forEach((id) => patchItem("progressReports", id, { publishedAt: nowIso() }));
                  toast.success(`${ids.length} reports published`);
                  clear();
                }}
              >
                <Send /> Publish selected
              </Button>
            )}
            emptyTitle="No reports yet"
            emptyEmoji="📈"
          />
        </TabsContent>

        <TabsContent value="children" className="pt-4">
          <ul className="grid gap-3 md:grid-cols-2">
            {roster.map((s) => {
              const mine = classReports.filter((r) => r.studentId === s.id);
              return (
                <li key={s.id} className="rounded-2xl border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <EmojiAvatar emoji={s.photoEmoji} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{studentName(s)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {mine.length} report{mine.length === 1 ? "" : "s"} ·{" "}
                          {milestonesOf(milestones, s.id).length} milestones
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="xs" variant="outline" onClick={() => openCreate(s.id)}>
                        <Plus /> Report
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setMilestone({ label: "", skill: "cognitive", emoji: "⭐", note: "" });
                          setMilestoneFor(s.id);
                        }}
                      >
                        <Award />
                      </Button>
                    </div>
                  </div>
                  {milestonesOf(milestones, s.id).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {milestonesOf(milestones, s.id)
                        .slice(0, 3)
                        .map((m) => (
                          <Badge key={m.id} variant="outline" className="text-[10px]">
                            {m.emoji} {m.label}
                          </Badge>
                        ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </TabsContent>
      </Tabs>

      {/* report editor */}
      <FormDialog
        open={!!editing || !!creatingFor}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setCreatingFor("");
          }
        }}
        title={editing ? "Edit report" : "New report"}
        description={(() => {
          const s = students.find((x) => x.id === draft.studentId);
          return s ? studentName(s) : undefined;
        })()}
        submitLabel="Save report"
        onSubmit={save}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Term"
            value={draft.term}
            onChange={(v) => setDraft({ ...draft, term: v })}
            options={TERMS.map((t) => ({ value: t, label: t }))}
          />
          <TextField
            label="Attendance %"
            type="number"
            min={0}
            max={100}
            value={draft.attendancePct}
            onChange={(v) => setDraft({ ...draft, attendancePct: Number(v) })}
          />
        </div>

        <div className="space-y-2.5 rounded-xl border p-3">
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Skill scores</p>
          {SKILLS.map((skill) => (
            <div key={skill}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{SKILL_LABELS[skill]}</span>
                <span className="tabular-nums text-muted-foreground">{draft.scores[skill]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={draft.scores[skill]}
                onChange={(e) => setDraft({ ...draft, scores: { ...draft.scores, [skill]: Number(e.target.value) } })}
                className="mt-1 w-full accent-[#DC2638]"
                aria-label={SKILL_LABELS[skill]}
              />
            </div>
          ))}
        </div>

        <TextareaField
          label="Remark for parents"
          required
          rows={4}
          value={draft.teacherRemark}
          onChange={(v) => setDraft({ ...draft, teacherRemark: v })}
          placeholder="A curious, warm child who has settled beautifully this term…"
        />
        <ListField label="Strengths" values={draft.strengths} onChange={(v) => setDraft({ ...draft, strengths: v })} placeholder="Curiosity, fine motor" />
        <ListField label="Focus areas" values={draft.focusAreas} onChange={(v) => setDraft({ ...draft, focusAreas: v })} placeholder="Turn-taking" />
      </FormDialog>

      {/* report preview */}
      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={(() => {
          const s = viewing ? students.find((x) => x.id === viewing.studentId) : null;
          return s ? `${studentName(s)} — ${viewing?.term}` : "";
        })()}
        description={viewing?.publishedAt ? `Published ${formatDate(viewing.publishedAt)}` : "Draft — parents cannot see this yet"}
        size="lg"
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              {!viewing.publishedAt && (
                <Button
                  onClick={() => {
                    patchItem("progressReports", viewing.id, { publishedAt: nowIso() });
                    toast.success("Report published");
                    setViewing(null);
                  }}
                >
                  <Send /> Publish
                </Button>
              )}
            </>
          )
        }
      >
        {viewing && (
          <>
            <SkillBars data={skillSeries(viewing)} />
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Teacher&apos;s remark</p>
              {viewing.teacherRemark}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Strengths</p>
                <div className="flex flex-wrap gap-1">
                  {viewing.strengths.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                  {viewing.strengths.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Focus areas</p>
                <div className="flex flex-wrap gap-1">
                  {viewing.focusAreas.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                  {viewing.focusAreas.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Milestones</p>
              {milestonesOf(milestones, viewing.studentId).length === 0 ? (
                <p className="text-sm text-muted-foreground">None logged.</p>
              ) : (
                <Timeline
                  items={milestonesOf(milestones, viewing.studentId)
                    .slice(0, 5)
                    .map((m) => ({ id: m.id, icon: m.emoji, title: m.label, meta: formatDate(m.achievedOn) }))}
                />
              )}
            </div>
          </>
        )}
      </DetailDialog>

      {/* milestone */}
      <FormDialog
        open={!!milestoneFor}
        onOpenChange={(o) => !o && setMilestoneFor("")}
        title="Log a milestone"
        submitLabel="Log it"
        onSubmit={() => {
          if (!milestone.label.trim()) {
            toast.error("What did they achieve?");
            return false;
          }
          addItem("milestones", {
            id: newId("ms"),
            studentId: milestoneFor,
            label: milestone.label.trim(),
            skill: milestone.skill,
            achievedOn: nowIso(),
            note: milestone.note,
            emoji: milestone.emoji || "⭐",
            createdAt: nowIso(),
          });
          toast.success("Milestone logged — parents will see it");
          setMilestoneFor("");
          return true;
        }}
        size="sm"
      >
        <TextField label="Milestone" required value={milestone.label} onChange={(v) => setMilestone({ ...milestone, label: v })} placeholder="Wrote own first name" />
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <SelectField
            label="Skill"
            value={milestone.skill}
            onChange={(v) => setMilestone({ ...milestone, skill: v as SkillKey })}
            options={SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }))}
          />
          <TextField label="Emoji" value={milestone.emoji} onChange={(v) => setMilestone({ ...milestone, emoji: v })} />
        </div>
        <TextareaField label="Note" rows={2} value={milestone.note} onChange={(v) => setMilestone({ ...milestone, note: v })} />
      </FormDialog>
    </div>
  );
}
