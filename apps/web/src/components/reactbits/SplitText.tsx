"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
};

export function SplitText({
  text,
  className,
  delay = 0,
  stagger = 0.045,
  as = "h1",
}: Props) {
  const words = text.split(" ");
  const MotionTag = motion[as] as typeof motion.h1;

  return (
    <MotionTag
      className={cn("inline-block", className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      aria-label={text}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split("").map((ch, ci) => (
            <motion.span
              key={`${wi}-${ci}`}
              className="inline-block"
              variants={{
                hidden: { y: "0.6em", opacity: 0, rotate: -8 },
                visible: {
                  y: 0,
                  opacity: 1,
                  rotate: 0,
                  transition: { type: "spring", stiffness: 240, damping: 18 },
                },
              }}
            >
              {ch}
            </motion.span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </MotionTag>
  );
}
