/** Small shared display bits used across the portals. */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Emoji-first avatar (real photos slot in later without changing callers). */
export function EmojiAvatar({
  emoji,
  size = "md",
  ring,
  className,
}: {
  emoji: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  className?: string;
}) {
  const sizes = {
    xs: "h-7 w-7 text-sm",
    sm: "h-9 w-9 text-base",
    md: "h-11 w-11 text-xl",
    lg: "h-14 w-14 text-2xl",
    xl: "h-20 w-20 text-4xl",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-ck-sky",
        ring && "ring-2 ring-white",
        sizes[size],
        className,
      )}
    >
      {emoji}
    </span>
  );
}

/** Card with a title row and optional action — the default section container. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  icon,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className={cn("h-full", className)}>
      {(title || action) && (
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(bodyClassName)}>{children}</CardContent>
    </Card>
  );
}

/** Inline key/value pair used in detail panels. */
export function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

export function Tag({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "brand" | "blue" | "green" | "orange";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    brand: "bg-ck-red/10 text-ck-red-ink",
    blue: "bg-ck-blue/15 text-sky-700",
    green: "bg-ck-green/15 text-ck-green-ink",
    orange: "bg-ck-orange/15 text-ck-orange-ink",
  };
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

/** Vertical timeline used for milestones, audit trails and day logs. */
export function Timeline({
  items,
  className,
}: {
  items: { id: string; icon?: React.ReactNode; title: React.ReactNode; meta?: React.ReactNode; body?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-4 border-l pl-5", className)}>
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute top-1 -left-[1.65rem] grid h-6 w-6 place-items-center rounded-full bg-background ring-1 ring-border text-xs">
            {item.icon ?? "•"}
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{item.title}</p>
            {item.meta && <span className="text-xs text-muted-foreground">{item.meta}</span>}
          </div>
          {item.body && <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>}
        </li>
      ))}
    </ol>
  );
}

/** Numbered step indicator for the multi-step admissions form. */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-2", className)}>
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                state === "done" && "bg-ck-green text-white",
                state === "active" && "bg-ck-red text-white",
                state === "todo" && "bg-muted text-muted-foreground",
              )}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                state === "todo" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {step}
            </span>
            {i < steps.length - 1 && <span className="hidden h-px w-6 bg-border sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}
