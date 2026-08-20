"use client";

import { toast } from "sonner";
import { Award, Download, LineChart, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { attendanceRate, milestonesOf, skillSeries, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { SectionCard, Timeline } from "@/frontend/components/ui/Bits";
import { RadialStat, SkillBars } from "@/frontend/components/ui/Charts";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { SKILL_LABELS, type SkillKey } from "@/shared/types/learning.types";
import { CATALOGUE } from "@/shared/fixtures";
import { formatDate } from "@/frontend/utils/formatters";

const SKILLS: SkillKey[] = ["cognitive", "language", "motor", "social", "emotional", "creative"];

export function ReportsView() {
  const { child } = useSelectedChild();
  const reports = useErpStore((s) => s.progressReports);
  const milestones = useErpStore((s) => s.milestones);
  const attendance = useErpStore((s) => s.attendance);
  const journeys = useErpStore((s) => s.journeys);

  if (!child) return <EmptyState emoji="👶" title="No child linked to this account" />;

  const published = reports
    .filter((r) => r.studentId === child.id && r.publishedAt)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  const mine = milestonesOf(milestones, child.id);
  const journey = journeys.find((j) => j.studentId === child.id);
  const program = CATALOGUE.programs.find((p) => p.slug === child.programSlug);
  const latest = published[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress reports"
        description={`How ${child.firstName} is developing across six areas, term by term.`}
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Progress" }]}
        actions={
          latest && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print report
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Reports"
          value={published.length}
          accent="blue"
          icon={<LineChart className="h-4 w-4" />}
          sub={latest ? latest.term : "none yet"}
        />
        <KpiCard label="Milestones" value={mine.length} accent="magenta" icon={<Award className="h-4 w-4" />} />
        <KpiCard label="Attendance" value={`${attendanceRate(attendance, child.id)}%`} accent="green" />
        <KpiCard label="Kids-zone stars" value={journey?.stars ?? 0} accent="orange" href="/kids/rewards" />
      </div>

      {published.length === 0 ? (
        <EmptyState
          emoji="📈"
          title="No published report yet"
          description="Teachers publish a report at the end of each term. Milestones below update as they happen."
        />
      ) : (
        <Tabs defaultValue={published[0].id}>
          <TabsList>
            {published.map((r) => (
              <TabsTrigger key={r.id} value={r.id}>
                {r.term.split("·")[0].trim()}
              </TabsTrigger>
            ))}
          </TabsList>

          {published.map((r) => {
            const avg = Math.round(SKILLS.reduce((sum, k) => sum + r.scores[k], 0) / SKILLS.length);
            return (
              <TabsContent key={r.id} value={r.id} className="space-y-4 pt-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                  <SectionCard title="Skill development" description={`${r.term} · published ${formatDate(r.publishedAt ?? "")}`}>
                    <SkillBars data={skillSeries(r)} />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Strengths</p>
                        <div className="flex flex-wrap gap-1">
                          {r.strengths.map((s) => (
                            <Badge key={s} variant="secondary">
                              {s}
                            </Badge>
                          ))}
                          {r.strengths.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                          What we&apos;re working on
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {r.focusAreas.map((s) => (
                            <Badge key={s} variant="outline">
                              {s}
                            </Badge>
                          ))}
                          {r.focusAreas.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <div className="space-y-4">
                    <SectionCard title="Overall">
                      <div className="flex flex-col items-center gap-3">
                        <RadialStat value={avg} label="Average score" color="#8BC53F" />
                        <RadialStat value={r.attendancePct} label="Attendance" color="#2BAEEC" size={100} />
                      </div>
                    </SectionCard>
                    <SectionCard title="Program milestones" description={program?.name}>
                      <ul className="space-y-1.5 text-sm">
                        {(program?.milestones ?? []).map((m) => (
                          <li key={m} className="flex items-start gap-2">
                            <span className="text-ck-green">✓</span>
                            <span className="text-muted-foreground">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  </div>
                </div>

                <SectionCard title="Teacher's remark">
                  <p className="text-sm">{r.teacherRemark}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.print()}>
                      <Printer /> Print
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success("Report downloaded")}>
                      <Download /> Download PDF
                    </Button>
                  </div>
                </SectionCard>

                <SectionCard title="Score detail">
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {SKILLS.map((k) => (
                      <li key={k} className="rounded-xl border p-3">
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">{SKILL_LABELS[k]}</p>
                        <p className="font-heading text-xl font-bold">{r.scores[k]}%</p>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <SectionCard
        title={`Milestones (${mine.length})`}
        description={`Everything ${child.firstName} has achieved, newest first`}
        icon={<Award className="h-4 w-4 text-ck-magenta" />}
      >
        {mine.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Teachers log milestones as they happen — nothing yet.
          </p>
        ) : (
          <Timeline
            items={mine.map((m) => ({
              id: m.id,
              icon: m.emoji,
              title: m.label,
              meta: formatDate(m.achievedOn),
              body: (
                <span>
                  <Badge variant="outline" className="mr-1.5 text-[10px]">
                    {SKILL_LABELS[m.skill]}
                  </Badge>
                  {m.note}
                </span>
              ),
            }))}
          />
        )}
      </SectionCard>

      <p className="text-center text-xs text-muted-foreground">
        Reports for {studentName(child)} · questions? Message the class teacher from the Messages tab.
      </p>
    </div>
  );
}
