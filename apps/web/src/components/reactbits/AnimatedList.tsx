"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedList({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { y: 24, opacity: 0 },
        visible: {
          y: 0,
          opacity: 1,
          transition: { type: "spring", stiffness: 220, damping: 22 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
