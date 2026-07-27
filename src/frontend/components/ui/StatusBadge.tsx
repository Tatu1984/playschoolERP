import { cn } from "@/lib/utils";
import { titleCase } from "@/shared/utils/common.util";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-emerald-500/12 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-500/15 text-amber-700 ring-amber-600/20",
  danger: "bg-ck-red/10 text-ck-red ring-ck-red/20",
  info: "bg-ck-blue/12 text-sky-700 ring-sky-600/20",
  neutral: "bg-muted text-muted-foreground ring-foreground/10",
  brand: "bg-ck-magenta/10 text-ck-magenta ring-ck-magenta/20",
};

/** Status → tone map covering every enum in the SoW data model. */
const TONES: Record<string, Tone> = {
  // people / records
  ACTIVE: "success",
  ON_LEAVE: "warning",
  GRADUATED: "info",
  WITHDRAWN: "neutral",
  RESIGNED: "neutral",
  // attendance
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  HALF_DAY: "warning",
  UNMARKED: "neutral",
  // invoices
  PAID: "success",
  PARTIAL: "warning",
  OVERDUE: "danger",
  SENT: "info",
  DRAFT: "neutral",
  CANCELLED: "neutral",
  // lessons / applications / bookings
  PLANNED: "info",
  IN_PROGRESS: "warning",
  DONE: "success",
  SKIPPED: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  DOCS_PENDING: "warning",
  SEAT_OFFERED: "brand",
  ACCEPTED: "success",
  REJECTED: "danger",
  REQUESTED: "info",
  CONFIRMED: "success",
  COMPLETED: "success",
  DECLINED: "danger",
  // admissions pipeline
  NEW: "info",
  CONTACTED: "warning",
  VISIT_SCHEDULED: "brand",
  APPLICATION: "warning",
  ENROLLED: "success",
  LOST: "neutral",
  // notices / broadcasts
  NORMAL: "neutral",
  IMPORTANT: "warning",
  URGENT: "danger",
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "danger",
  // content
  PUBLISHED: "success",
};

export function toneFor(status: string): Tone {
  return TONES[status] ?? "neutral";
}

export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status: string;
  label?: string;
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone ?? toneFor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        TONE_CLASS[resolved],
        className,
      )}
    >
      {label ?? titleCase(status)}
    </span>
  );
}
