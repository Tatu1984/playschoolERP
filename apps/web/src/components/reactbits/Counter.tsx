"use client";

import { animate, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Counter({
  to,
  from = 0,
  duration = 1.6,
  suffix = "",
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(from);
  const rounded = useTransform(count, (v) => Math.round(v).toString());

  useEffect(() => {
    if (inView) {
      const controls = animate(count, to, { duration, ease: "easeOut" });
      return controls.stop;
    }
  }, [inView, to, duration, count]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
