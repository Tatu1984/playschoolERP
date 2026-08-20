import Link from "next/link";
import { GradientText } from "@/components/reactbits/GradientText";
import { Aurora } from "@/components/reactbits/Aurora";
import { FloatingShapes } from "@/components/reactbits/FloatingShapes";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  highlight,
  trailing,
  description,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  trailing?: string;
  description?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden pt-12 pb-14 sm:pt-16 sm:pb-20">
      <Aurora className="opacity-60" />
      <FloatingShapes />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <nav
          aria-label="Breadcrumb"
          className="flex justify-center text-xs font-bold tracking-wider uppercase text-ck-navy/55"
        >
          <Link href="/" className="hover:text-ck-red">Home</Link>
          <ChevronRight className="mx-1.5 h-3.5 w-3.5" />
          <span className="text-ck-navy">{eyebrow}</span>
        </nav>

        <Badge variant="secondary" className="mt-4 rounded-full bg-white/80 backdrop-blur border border-ck-cream text-ck-navy font-bold px-4">
          {eyebrow}
        </Badge>

        <h1 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] text-ck-navy">
          {title}{" "}
          {highlight && <GradientText>{highlight}</GradientText>}
          {trailing && <span> {trailing}</span>}
        </h1>

        {description && (
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ck-navy/75 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
