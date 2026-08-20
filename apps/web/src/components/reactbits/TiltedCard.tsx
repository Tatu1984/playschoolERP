"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export function TiltedCard({
  children,
  className,
  glare = true,
}: {
  children: React.ReactNode;
  className?: string;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), {
    stiffness: 220,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), {
    stiffness: 220,
    damping: 18,
  });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const glareX = useTransform(x, (v) => 50 + v * 80);
  const glareY = useTransform(y, (v) => 50 + v * 80);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.55), transparent 55%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={cn("relative will-change-transform", className)}
    >
      <div style={{ transform: "translateZ(40px)" }} className="relative h-full">
        {children}
      </div>
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}
