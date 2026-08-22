"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BellRing,
  Ban,
  CreditCard,
  Eye,
  IndianRupee,
  Pencil,
  Plus,
  Printer,
  Send,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useBranchScope } from "@/frontend/hooks/useSelection";
import { collectedOf, outstandingOf, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { DetailDialog, DetailRow, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField } from "@/frontend/components/ui/Field";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { BarChart } from "@/frontend/components/ui/Charts";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { CATALOGUE } from "@/shared/fixtures";
import type { FeeStructure, Invoice, Payment } from "@/shared/types/engagement.types";
import type { ProgramSlug } from "@/shared/types/school.types";
import { formatMoney, newId, titleCase } from "@/shared/utils/common.util";
import { dateKey, daysAhead, nowIso } from "@/shared/utils/date.util";
import { formatDate, relativeDays } from "@/frontend/utils/formatters";

export function FeesManager() {
  const { branches, inScope } = useBranchScope();
  const invoices = useErpStore((s) => s.invoices);
  const payments = useErpStore((s) => s.payments);
  const structures = useErpStore((s) => s.feeStructures);
  const students = useErpStore((s) => s.students);
  const analytics = useErpStore((s) => s.analytics);
  const payInvoice = useErpStore((s) => s.payInvoice);
  const patchItem = useErpStore((s) => s.patchItem);
  const addItem = useErpStore((s) => s.addItem);

  const rows = inScope(invoices);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [collecting, setCollecting] = useState<Invoice | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState<Payment["method"]>("UPI");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueDraft, setIssueDraft] = useState({ studentId: "", term: "Term 3 · 2026-27", amount: "22500", dueOn: dateKey(new Date(daysAhead(15))) });
  const [structDraft, setStructDraft] = useState<FeeStructure | null>(null);

  const outstanding = outstandingOf(rows);
  const collected = collectedOf(rows);
  const collectionRate = collected + outstanding > 0 ? Math.round((collected / (collected + outstanding)) * 100) : 0;

  const columns: Column<Invoice>[] = [
    {
      key: "invoice",
      header: "Invoice",
      sortValue: (i) => i.number,
      cell: (i) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{i.number}</p>
          <p className="truncate text-xs text-muted-foreground">{i.term}</p>
        </div>
      ),
    },
    {
      key: "student",
      header: "Student",
      sortValue: (i) => i.studentName,
      cell: (i) => <span className="text-sm">{i.studentName}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      sortValue: (i) => i.amount + i.lateFee,
      cell: (i) => (
        <div>
          <p className="font-semibold tabular-nums">{formatMoney(i.amount + i.lateFee)}</p>
          {i.lateFee > 0 && <p className="text-xs text-ck-red">incl. {formatMoney(i.lateFee)} late fee</p>}
        </div>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      hideOnMobile: true,
      sortValue: (i) => i.paidAmount,
      cell: (i) => <span className="tabular-nums">{formatMoney(i.paidAmount)}</span>,
    },
    {
      key: "due",
      header: "Due",
      hideOnMobile: true,
      sortValue: (i) => i.dueOn,
      cell: (i) => (
        <div>
          <p className="text-sm">{formatDate(i.dueOn)}</p>
          <p className={i.status === "OVERDUE" ? "text-xs text-ck-red" : "text-xs text-muted-foreground"}>
            {relativeDays(i.dueOn)}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", sortValue: (i) => i.status, cell: (i) => <StatusBadge status={i.status} /> },
  ];

  async function collect(): Promise<boolean> {
    if (!collecting) return false;
    const amount = Number(collectAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter an amount");
      return false;
    }
    // The office is recording cash it is holding, so the confirmation has to
    // mean the database agrees. Saying "recorded" and having recorded nothing
    // is how a family gets chased for fees they already paid at the desk.
    const recorded = await payInvoice(collecting.id, amount, collectMethod);
    if (!recorded) return false;
    toast.success(`${formatMoney(amount)} recorded against ${collecting.number}`);
    setCollecting(null);
    return true;
  }

  function issue(): boolean {
    const student = students.find((s) => s.id === issueDraft.studentId);
    if (!student) {
      toast.error("Pick a student");
      return false;
    }
    const amount = Number(issueDraft.amount) || 0;
    addItem("invoices", {
      id: newId("inv"),
      number: `CK/T3/${2000 + invoices.length}`,
      studentId: student.id,
      studentName: studentName(student),
      branchId: student.branchId,
      term: issueDraft.term,
      lines: [{ id: newId("l"), label: "Term fee", amount, qty: 1 }],
      amount,
      paidAmount: 0,
      lateFee: 0,
      dueOn: new Date(issueDraft.dueOn).toISOString(),
      status: "SENT",
      issuedOn: nowIso(),
      notes: "",
      createdAt: nowIso(),
    });
    toast.success(`Invoice issued to ${studentName(student)}`);
    return true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fees"
        description="Invoices, collections and per-program fee structures."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Fees" }]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                const pending = rows.filter((i) => i.status !== "PAID").length;
                toast.success(`Reminder sent to ${pending} families`);
              }}
            >
              <BellRing /> Send reminders
            </Button>
            <Button onClick={() => setIssueOpen(true)}>
              <Plus /> New invoice
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Collected" value={formatMoney(collected)} accent="green" icon={<IndianRupee className="h-4 w-4" />} sub="this term" />
        <KpiCard label="Outstanding" value={formatMoney(outstanding)} accent="brand" sub={`${rows.filter((i) => i.status !== "PAID").length} invoices`} />
        <KpiCard label="Overdue" value={rows.filter((i) => i.status === "OVERDUE").length} accent="orange" sub="past due date" />
        <KpiCard label="Collection rate" value={`${collectionRate}%`} accent="blue" delta={4} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({rows.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="structures">Fee structures</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="pt-4">
          <DataTable
            rows={rows}
            columns={columns}
            rowId={(i) => i.id}
            searchable={(i) => `${i.number} ${i.studentName} ${i.term}`}
            searchPlaceholder="Search invoice or student…"
            exportName="invoices"
            onRowClick={setViewing}
            filters={[
              {
                key: "status",
                label: "Status",
                options: ["SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"].map((s) => ({ value: s, label: titleCase(s) })),
                predicate: (i, v) => i.status === v,
              },
            ]}
            rowActions={(i) => [
              { label: "View invoice", icon: <Eye />, onSelect: () => setViewing(i) },
              {
                label: "Record payment",
                icon: <CreditCard />,
                disabled: i.status === "PAID",
                onSelect: () => {
                  setCollecting(i);
                  setCollectAmount(`${i.amount + i.lateFee - i.paidAmount}`);
                },
              },
              { label: "Send reminder", icon: <Send />, onSelect: () => toast.success(`Reminder sent for ${i.number}`) },
              { label: "Print receipt", icon: <Printer />, disabled: i.paidAmount === 0, onSelect: () => window.print() },
              {
                label: "Cancel invoice",
                icon: <Ban />,
                destructive: true,
                separatorBefore: true,
                onSelect: () => {
                  patchItem("invoices", i.id, { status: "CANCELLED" });
                  toast.success(`${i.number} cancelled`);
                },
              },
            ]}
            bulkActions={(ids, clear) => (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast.success(`Reminders sent for ${ids.length} invoices`);
                    clear();
                  }}
                >
                  <Send /> Send reminders
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const results = await Promise.all(
                      ids.map((id) => {
                        const inv = invoices.find((x) => x.id === id);
                        if (!inv || inv.status === "PAID") return Promise.resolve(false);
                        return payInvoice(id, inv.amount + inv.lateFee - inv.paidAmount, "CASH");
                      }),
                    );
                    // Count what actually settled. "12 invoices marked paid"
                    // when three were refused is worse than no message at all.
                    const settled = results.filter(Boolean).length;
                    if (settled) toast.success(`${settled} invoice${settled === 1 ? "" : "s"} marked paid`);
                    if (settled < ids.length) {
                      toast.error(`${ids.length - settled} could not be settled — they are unchanged`);
                    }
                    clear();
                  }}
                >
                  Mark paid (cash)
                </Button>
              </>
            )}
            emptyTitle="No invoices"
            emptyEmoji="🧾"
          />
        </TabsContent>

        <TabsContent value="payments" className="pt-4">
          <DataTable
            rows={payments}
            columns={[
              { key: "receipt", header: "Receipt", sortValue: (p) => p.receiptNo, cell: (p) => <span className="font-medium">{p.receiptNo}</span> },
              {
                key: "student",
                header: "Student",
                sortValue: (p) => students.find((s) => s.id === p.studentId)?.firstName ?? "",
                cell: (p) => {
                  const s = students.find((x) => x.id === p.studentId);
                  return s ? studentName(s) : "—";
                },
              },
              { key: "amount", header: "Amount", sortValue: (p) => p.amount, cell: (p) => <span className="font-semibold tabular-nums">{formatMoney(p.amount)}</span> },
              { key: "method", header: "Method", hideOnMobile: true, sortValue: (p) => p.method, cell: (p) => <Badge variant="outline">{p.method}</Badge> },
              { key: "ref", header: "Reference", hideOnMobile: true, sortValue: (p) => p.reference, cell: (p) => <code className="text-xs">{p.reference}</code> },
              { key: "paidAt", header: "Paid", sortValue: (p) => p.paidAt, cell: (p) => formatDate(p.paidAt) },
            ]}
            rowId={(p) => p.id}
            searchable={(p) => `${p.receiptNo} ${p.reference} ${p.method}`}
            searchPlaceholder="Search receipts…"
            exportName="payments"
            rowActions={(p) => [
              { label: "Print receipt", icon: <Printer />, onSelect: () => window.print() },
              { label: "Email receipt", icon: <Send />, onSelect: () => toast.success(`Receipt ${p.receiptNo} emailed`) },
            ]}
            emptyTitle="No payments recorded"
            emptyEmoji="💳"
          />
        </TabsContent>

        <TabsContent value="structures" className="pt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {structures.map((fs) => (
              <SectionCard
                key={fs.id}
                title={CATALOGUE.programs.find((p) => p.slug === fs.programSlug)?.name ?? fs.programSlug}
                description={branches.find((b) => b.id === fs.branchId)?.name}
                action={
                  <Button size="icon-sm" variant="ghost" onClick={() => setStructDraft(fs)} aria-label="Edit fee structure">
                    <Pencil />
                  </Button>
                }
              >
                <ul className="space-y-1 text-sm">
                  {[
                    ["Admission (one-time)", fs.admissionFee],
                    ["Term fee", fs.termFee],
                    ["Transport", fs.transportFee],
                    ["Meals", fs.mealFee],
                    ["Activity kit", fs.activityFee],
                  ].map(([label, amount]) => (
                    <li key={label as string} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium tabular-nums">{formatMoney(amount as number)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between border-t pt-1.5">
                    <span className="font-semibold">Per term total</span>
                    <span className="font-bold tabular-nums">
                      {formatMoney(fs.termFee + fs.mealFee + fs.activityFee)}
                    </span>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  {fs.termsPerYear} terms/year · late fee {formatMoney(fs.lateFeePerDay)}/day
                </p>
              </SectionCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trend" className="pt-4">
          <SectionCard title="Fee collection by month" description="Across all branches (₹)">
            <BarChart data={analytics.feeCollection} color="#8BC53F" compact height={220} />
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* invoice detail */}
      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.number ?? ""}
        description={viewing ? `${viewing.studentName} · ${viewing.term}` : undefined}
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer /> Print
              </Button>
              <Button
                disabled={viewing.status === "PAID"}
                onClick={() => {
                  setCollecting(viewing);
                  setCollectAmount(`${viewing.amount + viewing.lateFee - viewing.paidAmount}`);
                  setViewing(null);
                }}
              >
                <CreditCard /> Record payment
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <>
            <div>
              <DetailRow label="Status">
                <StatusBadge status={viewing.status} />
              </DetailRow>
              <DetailRow label="Issued">{formatDate(viewing.issuedOn)}</DetailRow>
              <DetailRow label="Due">{formatDate(viewing.dueOn)}</DetailRow>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                  <th className="py-1.5 font-medium">Item</th>
                  <th className="py-1.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {viewing.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5">{l.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatMoney(l.amount * l.qty)}</td>
                  </tr>
                ))}
                {viewing.lateFee > 0 && (
                  <tr>
                    <td className="py-1.5 text-ck-red">Late fee</td>
                    <td className="py-1.5 text-right tabular-nums text-ck-red">{formatMoney(viewing.lateFee)}</td>
                  </tr>
                )}
                <tr className="font-semibold">
                  <td className="py-1.5">Total</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(viewing.amount + viewing.lateFee)}</td>
                </tr>
                <tr className="text-emerald-700">
                  <td className="py-1.5">Paid</td>
                  <td className="py-1.5 text-right tabular-nums">− {formatMoney(viewing.paidAmount)}</td>
                </tr>
                <tr className="border-t font-bold">
                  <td className="py-1.5">Balance</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatMoney(Math.max(0, viewing.amount + viewing.lateFee - viewing.paidAmount))}
                  </td>
                </tr>
              </tbody>
            </table>
            {payments.filter((p) => p.invoiceId === viewing.id).length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Payments</p>
                <ul className="space-y-1 text-sm">
                  {payments
                    .filter((p) => p.invoiceId === viewing.id)
                    .map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <span>
                          {p.receiptNo} · {p.method}
                        </span>
                        <span className="tabular-nums">{formatMoney(p.amount)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}
      </DetailDialog>

      {/* record payment */}
      <FormDialog
        open={!!collecting}
        onOpenChange={(o) => !o && setCollecting(null)}
        title="Record a payment"
        description={collecting ? `${collecting.number} · balance ${formatMoney(collecting.amount + collecting.lateFee - collecting.paidAmount)}` : undefined}
        submitLabel="Record"
        onSubmit={collect}
        size="sm"
      >
        <TextField label="Amount (₹)" type="number" value={collectAmount} onChange={setCollectAmount} />
        <SelectField
          label="Method"
          value={collectMethod}
          onChange={(v) => setCollectMethod(v as Payment["method"])}
          options={["UPI", "CARD", "NETBANKING", "CASH", "CHEQUE"].map((m) => ({ value: m, label: titleCase(m) }))}
        />
      </FormDialog>

      {/* new invoice */}
      <FormDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        title="Issue an invoice"
        submitLabel="Issue"
        onSubmit={issue}
      >
        <SelectField
          label="Student"
          value={issueDraft.studentId}
          onChange={(v) => setIssueDraft({ ...issueDraft, studentId: v })}
          options={students.map((s) => ({ value: s.id, label: studentName(s) }))}
          placeholder="Select a student"
        />
        <TextField label="Term" value={issueDraft.term} onChange={(v) => setIssueDraft({ ...issueDraft, term: v })} />
        <TextField label="Amount (₹)" type="number" value={issueDraft.amount} onChange={(v) => setIssueDraft({ ...issueDraft, amount: v })} />
        <TextField label="Due on" type="date" value={issueDraft.dueOn} onChange={(v) => setIssueDraft({ ...issueDraft, dueOn: v })} />
      </FormDialog>

      {/* fee structure */}
      <FormDialog
        open={!!structDraft}
        onOpenChange={(o) => !o && setStructDraft(null)}
        title="Edit fee structure"
        submitLabel="Save"
        onSubmit={() => {
          if (!structDraft) return false;
          patchItem("feeStructures", structDraft.id, structDraft);
          toast.success("Fee structure updated");
          setStructDraft(null);
          return true;
        }}
      >
        {structDraft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Program"
              value={structDraft.programSlug}
              onChange={(v) => setStructDraft({ ...structDraft, programSlug: v as ProgramSlug })}
              options={CATALOGUE.programs.map((p) => ({ value: p.slug, label: p.name }))}
            />
            <SelectField
              label="Branch"
              value={structDraft.branchId}
              onChange={(v) => setStructDraft({ ...structDraft, branchId: v })}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <TextField label="Admission fee" type="number" value={structDraft.admissionFee} onChange={(v) => setStructDraft({ ...structDraft, admissionFee: Number(v) })} />
            <TextField label="Term fee" type="number" value={structDraft.termFee} onChange={(v) => setStructDraft({ ...structDraft, termFee: Number(v) })} />
            <TextField label="Transport" type="number" value={structDraft.transportFee} onChange={(v) => setStructDraft({ ...structDraft, transportFee: Number(v) })} />
            <TextField label="Meals" type="number" value={structDraft.mealFee} onChange={(v) => setStructDraft({ ...structDraft, mealFee: Number(v) })} />
            <TextField label="Activity kit" type="number" value={structDraft.activityFee} onChange={(v) => setStructDraft({ ...structDraft, activityFee: Number(v) })} />
            <TextField label="Late fee / day" type="number" value={structDraft.lateFeePerDay} onChange={(v) => setStructDraft({ ...structDraft, lateFeePerDay: Number(v) })} />
          </div>
        )}
      </FormDialog>
    </div>
  );
}
