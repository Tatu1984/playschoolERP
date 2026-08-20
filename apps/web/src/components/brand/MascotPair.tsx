"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MascotPair({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <motion.div
      className={cn("relative", className)}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
      >
        <Image
          src="/brand/mascots.png"
          alt="Climb Kiddo mascots"
          width={1000}
          height={780}
          priority={priority}
          className="w-full h-auto drop-shadow-[0_18px_30px_rgba(26,31,75,0.18)]"
        />
      </motion.div>
    </motion.div>
  );
}
