import { cn } from "@/lib/utils";

export function EmptyState({
  emoji = "🗂️",
  title,
  description,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-2xl" aria-hidden>
        {emoji}
      </span>
      <div>
        <p className="font-heading text-base font-semibold">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
