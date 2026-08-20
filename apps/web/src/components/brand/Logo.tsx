import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  size = 48,
  withWordmark = true,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Climb Kiddo home"
      className={cn("flex items-center gap-2.5 sm:gap-3 group min-w-0", className)}
    >
      <span
        className="relative shrink-0 inline-block overflow-hidden rounded-full ring-2 ring-ck-cream shadow-md transition-transform group-hover:rotate-[10deg]"
        style={{ width: size, height: size }}
      >
        <Image
          src="/brand/logo.jpeg"
          alt="Climb Kiddo"
          fill
          sizes={`${size}px`}
          className="object-cover"
          priority
        />
      </span>
      {withWordmark && (
        <span className="flex flex-col leading-none min-w-0">
          <span className="font-[family-name:var(--font-fredoka)] text-lg sm:text-xl font-bold text-ck-orange truncate">
            Climb Kiddo
          </span>
          <span className="hidden sm:block mt-1 text-[10px] font-semibold tracking-widest text-ck-navy/70 whitespace-nowrap">
            DAYCARE · PLAYSCHOOL · KIDS ACTIVITY
          </span>
        </span>
      )}
    </Link>
  );
}
