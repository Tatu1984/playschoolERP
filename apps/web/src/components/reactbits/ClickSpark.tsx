"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Spark = { id: number; x: number; y: number };

export function ClickSpark({
  children,
  className,
  colors = ["#DC2638", "#F39A1E", "#2BAEEC", "#D4318F", "#8BC53F"],
}: {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    const newSparks: Spark[] = Array.from({ length: 10 }).map((_, i) => ({
      id: id + i,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }));
    setSparks((s) => [...s, ...newSparks]);
    setTimeout(() => {
      setSparks((s) => s.filter((sp) => !newSparks.find((n) => n.id === sp.id)));
    }, 700);
  };

  return (
    <div onClick={handleClick} className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {sparks.map((sp, i) => {
          const angle = (Math.PI * 2 * i) / 10;
          return (
            <motion.span
              key={sp.id}
              initial={{ x: sp.x, y: sp.y, scale: 1, opacity: 1 }}
              animate={{
                x: sp.x + Math.cos(angle) * 60,
                y: sp.y + Math.sin(angle) * 60,
                scale: 0,
                opacity: 0,
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="pointer-events-none absolute top-0 left-0 h-2 w-2 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
