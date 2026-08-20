"use client";

import { motion } from "framer-motion";

type Shape = {
  type: "star" | "balloon" | "cloud" | "circle" | "sparkle";
  color: string;
  size: number;
  top: string;
  left: string;
  delay: number;
};

const SHAPES: Shape[] = [
  { type: "star", color: "#F39A1E", size: 28, top: "8%", left: "6%", delay: 0 },
  { type: "balloon", color: "#DC2638", size: 36, top: "18%", left: "82%", delay: 0.5 },
  { type: "cloud", color: "#FFFFFF", size: 56, top: "12%", left: "55%", delay: 1 },
  { type: "circle", color: "#2BAEEC", size: 22, top: "55%", left: "4%", delay: 1.4 },
  { type: "sparkle", color: "#D4318F", size: 26, top: "70%", left: "90%", delay: 0.2 },
  { type: "star", color: "#8BC53F", size: 22, top: "40%", left: "92%", delay: 0.8 },
  { type: "balloon", color: "#2BAEEC", size: 30, top: "78%", left: "12%", delay: 1.6 },
  { type: "circle", color: "#F39A1E", size: 16, top: "30%", left: "30%", delay: 0.4 },
  { type: "sparkle", color: "#DC2638", size: 18, top: "62%", left: "62%", delay: 1.1 },
];

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 22 12 17.5 5.82 22l2.36-8.15L2 9.36h7.61z" />
    </svg>
  );
}
function Balloon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 24 30" fill="none">
      <ellipse cx="12" cy="10" rx="9" ry="10" fill={color} />
      <path d="M10 19l2 2 2-2-2 1.5z" fill={color} />
      <path d="M12 21v8" stroke="#1A1F4B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function Cloud({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 60 36" fill={color}>
      <circle cx="14" cy="22" r="12" />
      <circle cx="30" cy="14" r="14" />
      <circle cx="46" cy="22" r="12" />
      <rect x="10" y="22" width="40" height="12" rx="6" />
    </svg>
  );
}
function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2v8L20 12l-8 2v8l-2-8L2 12l8-2z" />
    </svg>
  );
}

export function FloatingShapes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {SHAPES.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: s.top, left: s.left }}
          animate={{
            y: [0, -18, 0, 18, 0],
            rotate: [0, 8, 0, -8, 0],
          }}
          transition={{
            duration: 7 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: s.delay,
          }}
        >
          {s.type === "star" && <Star size={s.size} color={s.color} />}
          {s.type === "balloon" && <Balloon size={s.size} color={s.color} />}
          {s.type === "cloud" && <Cloud size={s.size} color={s.color} />}
          {s.type === "sparkle" && <Sparkle size={s.size} color={s.color} />}
          {s.type === "circle" && (
            <div
              className="rounded-full"
              style={{ width: s.size, height: s.size, backgroundColor: s.color, opacity: 0.7 }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
