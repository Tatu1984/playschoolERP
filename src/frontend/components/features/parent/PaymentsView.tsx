"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  CreditCard,
  Download,
  Eye,
  IndianRupee,
  Landmark,
  Loader2,
  Receipt,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { invoicesFor, outstandingOf, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { SectionCard, InfoItem } from "@/frontend/components/ui/Bits";
import { DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { RowActions } from "@/frontend/components/ui/RowActions";
import type { Invoice, Payment } from "@/shared/types/engagement.types";
import { formatMoney } from "@/shared/utils/common.util";
import { formatDate, relativeDays } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

const METHODS: { value: Payment["method"]; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: "UPI", label: "UPI", icon: <Smartphone className="h-4 w-4" />, hint: "GPay, PhonePe, Paytm" },
  { value: "CARD", label: "Card", icon: <CreditCard className="h-4 w-4" />, hint: "Credit or debit" },
  { value: "NETBANKING", label: "Net banking", icon: <Landmark className="h-4 w-4" />, hint: "All major banks" },
];

export function PaymentsView() {
  const { child, kids } = useSelectedChild();
  const invoices = useErpStore((s) => s.invoices);
  const payments = useErpStore((s) => s.payments);
  const feeStructures = useErpStore((s) => s.feeStructures);
  const payInvoice = useErpStore((s) => s.payInvoice);

  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [method, setMethod] = useState<Payment["method"]>("UPI");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  if (!child) return <EmptyState emoji="👶" title="No child linked to this account" />;

  const mine = invoicesFor(invoices, kids.map((k) => k.id));
  const myPayments = payments.filter((p) => kids.some((k) => k.id === p.studentId));
  const due = outstandingOf(mine);
  const next = mine.find((i) => i.status !== "PAID");
  const structure = feeStructures.find((f) => f.programSlug === child.programSlug && f.branchId === child.branchId);

  function startPayment(invoice: Invoice) {
    setPaying(invoice);
    setAmount(`${invoice.amount + invoice.lateFee - invoice.paidAmount}`);
    setMethod("UPI");
  }

  /** Mirrors the real flow: create order → gateway → webhook marks paid. */
  async function checkout(): Promise<boolean> {
    if (!paying) return false;
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter an amount");
      return false;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));
    payInvoice(paying.id, value, method);
    setProcessing(false);
    const latest = useErpStore.getState().payments[0];
    setPaying(null);
    setReceipt(latest ?? null);
    toast.success(`${formatMoney(value)} paid — receipt ready`);
    return true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fees"
        description="Invoices, receipts and online payment."
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Fees" }]}
        actions={
          next && (
            <Button onClick={() => startPayment(next)}>
              <IndianRupee /> Pay {formatMoney(next.amount + next.lateFee - next.paidAmount)}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Outstanding"
          value={due > 0 ? formatMoney(due) : "₹0"}
          accent={due > 0 ? "brand" : "green"}
          icon={<Wallet className="h-4 w-4" />}
          sub={next ? `due ${relativeDays(next.dueOn)}` : "nothing due"}
        />
        <KpiCard label="Paid this year" value={formatMoney(myPayments.reduce((s, p) => s + p.amount, 0))} accent="green" />
        <KpiCard label="Invoices" value={mine.length} accent="navy" />
        <KpiCard label="Receipts" value={myPayments.length} accent="blue" icon={<Receipt className="h-4 w-4" />} />
      </div>

      {next && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4",
            next.status === "OVERDUE" ? "border-ck-red/40 bg-ck-red/5" : "border-ck-orange/40 bg-ck-orange/5",
          )}
        >
          <div className="min-w-0">
            <p className="font-heading text-base font-bold">
              {next.term} · {formatMoney(next.amount + next.lateFee - next.paidAmount)} due
            </p>
            <p className="text-sm text-muted-foreground">
              Invoice {next.number} · {next.status === "OVERDUE" ? "overdue" : `due ${relativeDays(next.dueOn)}`}
              {next.lateFee > 0 ? ` · includes ${formatMoney(next.lateFee)} late fee` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setViewing(next)}>
              <Eye /> View
            </Button>
            <Button onClick={() => startPayment(next)}>Pay now</Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({mine.length})</TabsTrigger>
          <TabsTrigger value="receipts">Receipts ({myPayments.length})</TabsTrigger>
          <TabsTrigger value="structure">Fee structure</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3 pt-4">
          {mine.length === 0 ? (
            <EmptyState emoji="🧾" title="No invoices yet" />
          ) : (
            mine.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {inv.number}
                    <StatusBadge status={inv.status} />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {inv.term} · {inv.studentName} · issued {formatDate(inv.issuedOn)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-heading text-base font-bold tabular-nums">
                      {formatMoney(inv.amount + inv.lateFee)}
                    </p>
                    {inv.paidAmount > 0 && inv.status !== "PAID" && (
                      <p className="text-xs text-emerald-600">{formatMoney(inv.paidAmount)} paid</p>
                    )}
                  </div>
                  {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                    <Button size="sm" onClick={() => startPayment(inv)}>
                      Pay
                    </Button>
                  )}
                  <RowActions
                    label="Invoice"
                    actions={[
                      { label: "View invoice", icon: <Eye />, onSelect: () => setViewing(inv) },
                      {
                        label: "Download PDF",
                        icon: <Download />,
                        onSelect: () => toast.success(`${inv.number}.pdf downloaded`),
                      },
                      {
                        label: "Email me a copy",
                        onSelect: () => toast.success("Sent to your registered email"),
                      },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="receipts" className="space-y-3 pt-4">
          {myPayments.length === 0 ? (
            <EmptyState emoji="🧾" title="No payments yet" />
          ) : (
            myPayments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{p.receiptNo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(p.paidAt)} · {p.method} · ref {p.reference}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-heading text-base font-bold tabular-nums text-emerald-600">
                    {formatMoney(p.amount)}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setReceipt(p)}>
                    <Receipt /> Receipt
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="structure" className="pt-4">
          <SectionCard
            title={`Fee structure — ${child.programSlug.replace("-", " ")}`}
            description="Per term, before optional add-ons"
          >
            {structure ? (
              <ul className="space-y-1.5 text-sm">
                {[
                  ["Admission fee (one-time)", structure.admissionFee],
                  ["Term fee", structure.termFee],
                  ["Meals", structure.mealFee],
                  ["Activity kit", structure.activityFee],
                  ["Transport (optional)", structure.transportFee],
                ].map(([label, value]) => (
                  <li key={label as string} className="flex justify-between border-b border-dashed pb-1.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium tabular-nums">{formatMoney(value as number)}</span>
                  </li>
                ))}
                <li className="flex justify-between pt-1">
                  <span className="font-semibold">Payable per term</span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(structure.termFee + structure.mealFee + structure.activityFee)}
                  </span>
                </li>
                <li className="pt-2 text-xs text-muted-foreground">
                  {structure.termsPerYear} terms a year · late fee {formatMoney(structure.lateFeePerDay)} per day after
                  the due date.
                </li>
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No published structure for this program yet.</p>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* invoice detail */}
      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.number ?? ""}
        description={viewing ? `${viewing.term} · ${viewing.studentName}` : undefined}
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => toast.success(`${viewing.number}.pdf downloaded`)}>
                <Download /> PDF
              </Button>
              {viewing.status !== "PAID" && (
                <Button
                  onClick={() => {
                    const inv = viewing;
                    setViewing(null);
                    startPayment(inv);
                  }}
                >
                  Pay now
                </Button>
              )}
            </>
          )
        }
      >
        {viewing && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
              <InfoItem label="Status" value={<StatusBadge status={viewing.status} />} />
              <InfoItem label="Due" value={formatDate(viewing.dueOn)} />
              <InfoItem label="Issued" value={formatDate(viewing.issuedOn)} />
              <InfoItem label="Child" value={viewing.studentName} />
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {viewing.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5">{l.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatMoney(l.amount * l.qty)}</td>
                  </tr>
                ))}
                {viewing.lateFee > 0 && (
                  <tr className="text-ck-red">
                    <td className="py-1.5">Late fee</td>
                    <td className="py-1.5 text-right tabular-nums">{formatMoney(viewing.lateFee)}</td>
                  </tr>
                )}
                <tr className="font-semibold">
                  <td className="py-1.5">Total</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(viewing.amount + viewing.lateFee)}</td>
                </tr>
                <tr className="text-emerald-600">
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
          </>
        )}
      </DetailDialog>

      {/* checkout */}
      <FormDialog
        open={!!paying}
        onOpenChange={(o) => !o && !processing && setPaying(null)}
        title="Pay fees"
        description={paying ? `${paying.number} · ${paying.term}` : undefined}
        submitLabel={processing ? "Processing…" : `Pay ${formatMoney(Number(amount) || 0)}`}
        onSubmit={checkout}
      >
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Amount payable</p>
          <p className="font-heading text-2xl font-bold">{formatMoney(Number(amount) || 0)}</p>
          {paying && paying.paidAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatMoney(paying.paidAmount)} already paid of {formatMoney(paying.amount + paying.lateFee)}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Payment method</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                  method === m.value ? "border-ck-red bg-ck-red/5" : "hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {m.icon}
                  {m.label}
                </span>
                <span className="text-xs text-muted-foreground">{m.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-ck-green/30 bg-ck-green/5 p-3 text-xs">
          <BadgeCheck className="h-4 w-4 shrink-0 text-ck-green" />
          Payments are processed by Razorpay. Climb Kiddo never stores your card details.
        </div>

        {processing && (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Talking to the payment gateway…
          </p>
        )}
      </FormDialog>

      {/* receipt */}
      <DetailDialog
        open={!!receipt}
        onOpenChange={(o) => !o && setReceipt(null)}
        title="Payment successful"
        description={receipt ? `Receipt ${receipt.receiptNo}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Download /> Save receipt
            </Button>
            <Button onClick={() => setReceipt(null)}>Done</Button>
          </>
        }
      >
        {receipt && (
          <>
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-ck-green/15 text-2xl" aria-hidden>
                ✅
              </span>
              <p className="font-heading text-2xl font-bold">{formatMoney(receipt.amount)}</p>
              <Badge variant="secondary">{receipt.method}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
              <InfoItem label="Receipt no" value={receipt.receiptNo} />
              <InfoItem label="Reference" value={receipt.reference} />
              <InfoItem label="Paid on" value={formatDate(receipt.paidAt)} />
              <InfoItem
                label="Child"
                value={(() => {
                  const s = kids.find((k) => k.id === receipt.studentId);
                  return s ? studentName(s) : "—";
                })()}
              />
            </div>
          </>
        )}
      </DetailDialog>
    </div>
  );
}
