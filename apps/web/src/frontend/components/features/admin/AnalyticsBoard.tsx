"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useBranchScope } from "@/frontend/hooks/useSelection";
import {
  attendanceRate,
  collectedOf,
  outstandingOf,
  presentTodayCount,
  studentName,
  weeklyAttendanceSeries,
} from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { BarChart, DonutChart, LineChart, RadialStat, SkillBars } from "@/frontend/components/ui/Charts";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { SelectField } from "@/frontend/components/ui/Field";
import { formatCompact, formatMoney } from "@/shared/utils/common.util";

export function AnalyticsBoard() {
  const { inScope } = useBranchScope();
  const analytics = useErpStore((s) => s.analytics);
  const students = useErpStore((s) => s.students);
  const attendance = useErpStore((s) => s.attendance);
  const invoices = useErpStore((s) => s.invoices);
  const activities = useErpStore((s) => s.activities);
  const gameSessions = useErpStore((s) => s.gameSessions);
  const inquiries = useErpStore((s) => s.inquiries);
  const [range, setRange] = useState("term");

  const scopedStudents = inScope(students);
  const scopedInvoices = inScope(invoices);
  const collected = collectedOf(scopedInvoices);
  const outstanding = outstandingOf(scopedInvoices);

  const avgAttendance = scopedStudents.length
    ? Math.round(scopedStudents.reduce((sum, s) => sum + attendanceRate(attendance, s.id), 0) / scopedStudents.length)
    : 0;

  const leaderboard = [...scopedStudents]
    .map((s) => ({ label: studentName(s), value: attendanceRate(attendance, s.id) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const sourceMix = ["WEBSITE", "WALK_IN", "REFERRAL", "PHONE", "SOCIAL", "CAMPAIGN"].map((src) => ({
    label: src.replace("_", " ").toLowerCase(),
    value: inquiries.filter((i) => i.source === src).length,
  })).filter((s) => s.value > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Attendance, fees, engagement and learning trends across the school."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Analytics" }]}
        actions={
          <>
            <div className="w-36">
              <SelectField
                value={range}
                onChange={setRange}
                options={[
                  { value: "week", label: "This week" },
                  { value: "month", label: "This month" },
                  { value: "term", label: "This term" },
                  { value: "year", label: "This year" },
                ]}
              />
            </div>
            <Button variant="outline" onClick={() => toast.success("Report queued — you'll get an email shortly")}>
              <Download /> Export report
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Avg attendance" value={`${avgAttendance}%`} accent="green" delta={2} sub="last 21 days" />
        <KpiCard label="Present today" value={presentTodayCount(attendance)} accent="blue" sub={`of ${scopedStudents.length}`} />
        <KpiCard label="Collected" value={formatMoney(collected)} accent="navy" delta={6} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Outstanding" value={formatMoney(outstanding)} accent="brand" delta={-3} />
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard title="This week" description="Percentage present, per weekday">
              <BarChart data={weeklyAttendanceSeries(attendance)} suffix="%" color="#8BC53F" height={200} />
            </SectionCard>
            <SectionCard title="Best attendance" description="Top 6 children">
              <SkillBars data={leaderboard} color="#2BAEEC" />
            </SectionCard>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SectionCard title="Overall">
              <div className="flex justify-center">
                <RadialStat value={avgAttendance} label="Average attendance" color="#8BC53F" />
              </div>
            </SectionCard>
            <SectionCard title="Weekday trend" className="lg:col-span-2">
              <LineChart data={analytics.attendanceTrend} suffix="%" color="#2BAEEC" height={180} />
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="fees" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard title="Collection by month" description="₹ collected">
              <BarChart data={analytics.feeCollection} color="#DC2638" compact height={220} />
            </SectionCard>
            <SectionCard title="Invoice status">
              <DonutChart
                data={[
                  { label: "Paid", value: scopedInvoices.filter((i) => i.status === "PAID").length },
                  { label: "Partial", value: scopedInvoices.filter((i) => i.status === "PARTIAL").length },
                  { label: "Sent", value: scopedInvoices.filter((i) => i.status === "SENT").length },
                  { label: "Overdue", value: scopedInvoices.filter((i) => i.status === "OVERDUE").length },
                ]}
                centerLabel="invoices"
              />
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Parent app engagement" description="% of parents active weekly">
              <LineChart data={analytics.engagement} suffix="%" color="#D4318F" height={200} />
            </SectionCard>
            <SectionCard title="Kids-zone game usage" description="Sessions per game">
              <BarChart data={analytics.gameUsage} color="#F39A1E" height={200} />
            </SectionCard>
            <SectionCard title="Content activity">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Activity posts published</span>
                  <span className="font-semibold tabular-nums">{activities.filter((a) => a.published).length}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Comments from parents</span>
                  <span className="font-semibold tabular-nums">
                    {activities.reduce((sum, a) => sum + a.comments.filter((c) => c.authorRole === "PARENT").length, 0)}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Hearts</span>
                  <span className="font-semibold tabular-nums">
                    {activities.reduce((sum, a) => sum + a.reactions.length, 0)}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Game sessions this session</span>
                  <span className="font-semibold tabular-nums">{gameSessions.length}</span>
                </li>
              </ul>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="learning" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Skill development" description="School-wide average score per skill">
              <SkillBars data={analytics.learningProgress} color="#8BC53F" />
            </SectionCard>
            <SectionCard title="Progress distribution">
              <DonutChart
                data={analytics.learningProgress.slice(0, 4)}
                centerLabel="avg score"
                centerValue={Math.round(
                  analytics.learningProgress.reduce((s, p) => s + p.value, 0) / analytics.learningProgress.length,
                )}
              />
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Retention by academic year" description="% of families returning">
              <BarChart data={analytics.retention} suffix="%" color="#1A1F4B" height={200} />
            </SectionCard>
            <SectionCard title="Enquiry sources" description={`${inquiries.length} enquiries this term`}>
              {sourceMix.length ? (
                <DonutChart data={sourceMix} centerLabel="enquiries" />
              ) : (
                <p className="text-sm text-muted-foreground">No enquiries yet.</p>
              )}
            </SectionCard>
            <SectionCard title="Headline numbers" className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <RadialStat value={96} label="Retention" color="#1A1F4B" />
                <RadialStat value={avgAttendance} label="Attendance" color="#8BC53F" />
                <RadialStat
                  value={collected + outstanding ? Math.round((collected / (collected + outstanding)) * 100) : 0}
                  label="Fees collected"
                  color="#DC2638"
                />
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="font-heading text-2xl font-bold">{formatCompact(collected)}</span>
                  <span className="text-xs text-muted-foreground">₹ this term</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
