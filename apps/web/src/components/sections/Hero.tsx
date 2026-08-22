"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SplitText } from "@/components/reactbits/SplitText";
import { BlurText } from "@/components/reactbits/BlurText";
import { GradientText } from "@/components/reactbits/GradientText";
import { ShinyText } from "@/components/reactbits/ShinyText";
import { Aurora } from "@/components/reactbits/Aurora";
import { FloatingShapes } from "@/components/reactbits/FloatingShapes";
import { Magnet } from "@/components/reactbits/Magnet";
import { ClickSpark } from "@/components/reactbits/ClickSpark";
import { MascotPair } from "@/components/brand/MascotPair";
import { Sparkles, Heart, Star, Phone } from "lucide-react";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-4 pb-24">
      <Aurora className="opacity-70" />
      <FloatingShapes />

      <ClickSpark className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-8 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pt-16">
        <div className="lg:col-span-7 relative z-10">
          <Badge
            variant="secondary"
            className="rounded-full bg-white/80 backdrop-blur px-4 py-1.5 text-ck-navy border border-ck-cream font-bold"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5 text-ck-orange" />
            <ShinyText>Admissions Open 2026–27</ShinyText>
          </Badge>

          <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-[1.05] tracking-tight text-ck-navy sm:text-6xl lg:text-7xl">
            <SplitText as="span" text="Where little" className="block" />
            <span className="block">
              <GradientText>climbers</GradientText>{" "}
              <SplitText as="span" text="grow big!" delay={0.4} />
            </span>
          </h1>

          <BlurText
            className="mt-6 max-w-xl text-lg leading-relaxed text-ck-navy/80"
            text="A warm, safe, and playful home for curious kids — daycare, playschool & kids activity all in one happy place. Designed for tiny hearts, big smiles, and unforgettable first lessons."
            delay={0.6}
          />

          <div className="mt-8 flex flex-wrap gap-4">
            <Magnet>
              <Button
                asChild
                size="lg"
                className="rounded-full bg-ck-red hover:bg-ck-red/90 px-8 py-6 text-base font-bold shadow-[0_6px_0_#9a1a28] hover:shadow-[0_3px_0_#9a1a28] hover:translate-y-[3px] transition-all"
              >
                <Link href="#contact">
                  <Heart className="mr-2 h-4 w-4" />
                  Book a Free Visit
                </Link>
              </Button>
            </Magnet>
            <Magnet>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-2 border-ck-navy/15 bg-white/70 backdrop-blur px-8 py-6 text-base font-bold text-ck-navy hover:bg-white"
              >
                <Link href="#programs">
                  <Star className="mr-2 h-4 w-4 text-ck-orange" />
                  Explore Programs
                </Link>
              </Button>
            </Magnet>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <a
              href="tel:+917003708969"
              className="group flex items-center gap-3"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ck-red text-white shadow-md transition-transform group-hover:scale-110">
                <Phone className="h-5 w-5" />
              </span>
              <span className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-ck-navy/75">
                  Talk to us
                </span>
                <span className="font-bold text-ck-navy">
                  70037 08969 · 98314 40029
                </span>
              </span>
            </a>

            <div className="flex -space-x-2">
              {["#DC2638", "#F39A1E", "#2BAEEC", "#8BC53F"].map((c) => (
                <span
                  key={c}
                  className="h-9 w-9 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-ck-navy/70">
              <span className="text-ck-red font-extrabold">200+</span> happy
              little climbers
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="relative mx-auto max-w-md">
            <div className="absolute -inset-8 rounded-[40%] bg-gradient-to-br from-ck-orange/40 via-ck-blue/30 to-ck-magenta/30 blur-3xl" />
            <div className="absolute inset-0 -z-10 rounded-[40%] bg-white/40 backdrop-blur-sm" />
            <MascotPair priority />
          </div>
        </div>
      </ClickSpark>
    </section>
  );
}
