import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Accent = "brand" | "orange" | "blue" | "green" | "magenta" | "navy" | "muted";

const ACCENT_TEXT: Record<Accent, string> = {
  brand: "text-ck-red",
  orange: "text-ck-orange",
  blue: "text-ck-blue",
  green: "text-ck-green",
  magenta: "text-ck-magenta",
  navy: "text-ck-navy",
  muted: "text-foreground",
};

const ACCENT_BG: Record<Accent, string> = {
  brand: "bg-ck-red/10 text-ck-red",
  orange: "bg-ck-orange/15 text-ck-orange",
  blue: "bg-ck-blue/15 text-ck-blue",
  green: "bg-ck-green/15 text-ck-green",
  magenta: "bg-ck-magenta/10 text-ck-magenta",
  navy: "bg-ck-navy/10 text-ck-navy",
  muted: "bg-muted text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = "muted",
  delta,
  href,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: Accent;
  /** Percentage change vs the previous period. */
  delta?: number;
  href?: string;
  className?: string;
}) {
  const body = (
    <Card className={cn("h-full transition hover:shadow-sm", href && "hover:border-ck-red/30", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className={cn("mt-1 font-heading text-2xl font-bold tabular-nums", ACCENT_TEXT[accent])}>{value}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {typeof delta === "number" && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold",
                  delta >= 0 ? "text-emerald-600" : "text-ck-red",
                )}
              >
                {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta)}%
              </span>
            )}
            {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
          </div>
        </div>
        {icon && (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", ACCENT_BG[accent])}>{icon}</span>
        )}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
