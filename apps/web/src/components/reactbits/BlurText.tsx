"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function BlurText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <motion.p
      className={cn("inline-block", className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05, delayChildren: delay } },
      }}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          variants={{
            hidden: { opacity: 0, filter: "blur(8px)", y: 8 },
            visible: {
              opacity: 1,
              filter: "blur(0px)",
              y: 0,
              transition: { duration: 0.55 },
            },
          }}
        >
          {w}
        </motion.span>
      ))}
    </motion.p>
  );
}
