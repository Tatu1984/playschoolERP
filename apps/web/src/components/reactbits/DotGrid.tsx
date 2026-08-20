import { cn } from "@/lib/utils";

export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 dot-grid", className)}
    />
  );
}
