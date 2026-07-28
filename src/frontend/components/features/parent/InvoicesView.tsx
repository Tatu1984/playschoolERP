"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, Eye, FileText, Printer, Receipt, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { invoicesFor, outstandingOf, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { DetailDialog } from "@/frontend/components/ui/FormDialog";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { InfoItem } from "@/frontend/components/ui/Bits";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import type { Invoice } from "@/shared/types/engagement.types";
import { formatMoney, titleCase } from "@/shared/utils/common.util";
import { formatDate, relativeDays } from "@/frontend/utils/formatters";

/**
 * SoW §8.3 lists a dedicated invoices route alongside /parent/payments: the
 * payments page is "what do I owe right now", this is the full paper trail.
 */
export function InvoicesView() {
  const { child, kids } = useSelectedChild();
  const invoices = useErpStore((s) => s.invoices);
  const payments = useErpStore((s) => s.payments);
  const [viewing, setViewing] = useState<Invoice | null>(null);

  if (!child) return <EmptyState emoji="👶" title="No child linked to this account" />;

  const kidIds = kids.map((k) => k.id);
  const mine = invoicesFor(invoices, kidIds);
  const myPayments = payments.filter((p) => kidIds.includes(p.studentId));
  const totalBilled = mine.reduce((s, i) => s + i.amount + i.lateFee, 0);
  const totalPaid = mine.reduce((s, i) => s + i.paidAmount, 0);

  const columns: Column<Invoice>[] = [
    {
      key: "number",
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
      key: "child",
      header: "Child",
      hideOnMobile: true,
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
          {i.lateFee > 0 && <p className="text-xs text-ck-red">incl. late fee</p>}
        </div>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      hideOnMobile: true,
      sortValue: (i) => i.amount + i.lateFee - i.paidAmount,
      cell: (i) => {
        const balance = Math.max(0, i.amount + i.lateFee - i.paidAmount);
        return (
          <span className={balance > 0 ? "font-semibold tabular-nums text-ck-red" : "tabular-nums text-emerald-600"}>
            {balance > 0 ? formatMoney(balance) : "settled"}
          </span>
        );
      },
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices &amp; receipts"
        description={`Every bill and payment for ${kids.length > 1 ? "your children" : child.firstName}, oldest to newest.`}
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Fees", href: "/parent/payments" }, { label: "Invoices" }]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/parent/payments">
                <ArrowLeft /> Fees overview
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print statement
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Invoices" value={mine.length} accent="navy" icon={<FileText className="h-4 w-4" />} />
        <KpiCard label="Total billed" value={formatMoney(totalBilled)} accent="blue" />
        <KpiCard label="Total paid" value={formatMoney(totalPaid)} accent="green" />
        <KpiCard
          label="Outstanding"
          value={formatMoney(outstandingOf(mine))}
          accent={outstandingOf(mine) > 0 ? "brand" : "muted"}
        />
      </div>

      <DataTable
        rows={mine}
        columns={columns}
        rowId={(i) => i.id}
        searchable={(i) => `${i.number} ${i.term} ${i.studentName}`}
        searchPlaceholder="Search invoice or term…"
        exportName="my-invoices"
        onRowClick={setViewing}
        filters={[
          {
            key: "status",
            label: "Status",
            options: ["SENT", "PARTIAL", "PAID", "OVERDUE"].map((s) => ({ value: s, label: titleCase(s) })),
            predicate: (i, v) => i.status === v,
          },
          ...(kids.length > 1
            ? [
                {
                  key: "child",
                  label: "Child",
                  options: kids.map((k) => ({ value: k.id, label: studentName(k) })),
                  predicate: (i: Invoice, v: string) => i.studentId === v,
                },
              ]
            : []),
        ]}
        rowActions={(i) => [
          { label: "View invoice", icon: <Eye />, onSelect: () => setViewing(i) },
          {
            label: "Download PDF",
            icon: <Download />,
            onSelect: () => toast.success(`${i.number}.pdf downloaded`),
          },
          {
            label: "Email me a copy",
            icon: <Send />,
            onSelect: () => toast.success("Sent to your registered email"),
          },
          ...(i.status !== "PAID"
            ? [
                {
                  label: "Pay this invoice",
                  separatorBefore: true,
                  onSelect: () => {
                    window.location.href = "/parent/payments";
                  },
                },
              ]
            : []),
        ]}
        emptyTitle="No invoices yet"
        emptyDescription="Term invoices appear here as soon as the office issues them."
        emptyEmoji="🧾"
      />

      {myPayments.length > 0 && (
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold">Receipts ({myPayments.length})</h2>
          <ul className="space-y-2">
            {myPayments.map((p) => {
              const invoice = mine.find((i) => i.id === p.invoiceId);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3.5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      {p.receiptNo}
                      <Badge variant="outline">{p.method}</Badge>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(p.paidAt)} · against {invoice?.number ?? "invoice"} · ref {p.reference}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-base font-bold tabular-nums text-emerald-600">
                      {formatMoney(p.amount)}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => toast.success(`${p.receiptNo}.pdf downloaded`)}>
                      <Download /> Receipt
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
                <Button asChild>
                  <Link href="/parent/payments">Pay now</Link>
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
              <InfoItem label="Issued" value={formatDate(viewing.issuedOn)} />
              <InfoItem label="Due" value={formatDate(viewing.dueOn)} />
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
            {payments.filter((p) => p.invoiceId === viewing.id).length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Payments against this invoice
                </p>
                <ul className="space-y-1 text-sm">
                  {payments
                    .filter((p) => p.invoiceId === viewing.id)
                    .map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <span>
                          {p.receiptNo} · {p.method} · {formatDate(p.paidAt)}
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
    </div>
  );
}
