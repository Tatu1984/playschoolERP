import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  accent = "slate",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "slate" | "red" | "green" | "amber" | "blue";
}) {
  const accents: Record<string, string> = {
    slate: "text-slate-900",
    red: "text-[#e63946]",
    green: "text-emerald-600",
    amber: "text-amber-600",
    blue: "text-sky-600",
  };
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold tabular-nums", accents[accent])}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </CardContent>
    </Card>
  );
}
