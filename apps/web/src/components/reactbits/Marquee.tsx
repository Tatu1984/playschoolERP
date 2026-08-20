import { cn } from "@/lib/utils";

export function Marquee({
  children,
  className,
  pauseOnHover = true,
}: {
  children: React.ReactNode;
  className?: string;
  pauseOnHover?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex w-full overflow-hidden",
        pauseOnHover && "[--paused:running] hover:[--paused:paused]",
        className,
      )}
    >
      <div
        className="flex shrink-0 gap-6 pr-6 animate-marquee"
        style={{ animationPlayState: "var(--paused, running)" as unknown as string }}
      >
        {children}
      </div>
      <div
        className="flex shrink-0 gap-6 pr-6 animate-marquee"
        aria-hidden
        style={{ animationPlayState: "var(--paused, running)" as unknown as string }}
      >
        {children}
      </div>
    </div>
  );
}
