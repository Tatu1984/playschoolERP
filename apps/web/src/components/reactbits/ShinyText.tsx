import { cn } from "@/lib/utils";

export function ShinyText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("text-shine", className)}>{children}</span>;
}
