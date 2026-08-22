import type { AccentColor } from "@/shared/types/school.types";

/**
 * Static Tailwind class maps. Never build brand classes by interpolation
 * (`bg-ck-${accent}`) — Tailwind scans source text and would not emit them.
 */
export const ACCENT_SOFT_BG: Record<AccentColor, string> = {
  red: "bg-ck-red/10",
  orange: "bg-ck-orange/12",
  blue: "bg-ck-blue/12",
  green: "bg-ck-green/12",
  magenta: "bg-ck-magenta/10",
  navy: "bg-ck-navy/8",
};

/**
 * Text uses the ink variants, not the bright hues. ck-green on white measures
 * 2.06:1 and ck-blue 2.5:1 against WCAG AA's 4.5:1 — a figure a parent with
 * ordinary eyesight cannot read. The bright colours stay for fills and icons,
 * where the requirement is different and they pass.
 */
export const ACCENT_TEXT: Record<AccentColor, string> = {
  red: "text-ck-red-ink",
  orange: "text-ck-orange-ink",
  blue: "text-ck-blue-ink",
  green: "text-ck-green-ink",
  magenta: "text-ck-magenta-ink",
  navy: "text-ck-navy",
};

export const ACCENT_BORDER: Record<AccentColor, string> = {
  red: "border-ck-red/30",
  orange: "border-ck-orange/30",
  blue: "border-ck-blue/30",
  green: "border-ck-green/30",
  magenta: "border-ck-magenta/30",
  navy: "border-ck-navy/20",
};

export const ACCENT_SOLID: Record<AccentColor, string> = {
  red: "bg-ck-red text-white",
  orange: "bg-ck-orange text-white",
  blue: "bg-ck-blue text-white",
  green: "bg-ck-green text-white",
  magenta: "bg-ck-magenta text-white",
  navy: "bg-ck-navy text-white",
};

export const ACCENT_GRADIENT: Record<AccentColor, string> = {
  red: "from-ck-red/20 to-ck-orange/10",
  orange: "from-ck-orange/20 to-ck-red/10",
  blue: "from-ck-blue/20 to-ck-green/10",
  green: "from-ck-green/20 to-ck-blue/10",
  magenta: "from-ck-magenta/20 to-ck-orange/10",
  navy: "from-ck-navy/15 to-ck-blue/10",
};

/** Hex values for the SVG charts, which cannot use Tailwind classes. */
export const ACCENT_HEX: Record<AccentColor, string> = {
  red: "#DC2638",
  orange: "#F39A1E",
  blue: "#2BAEEC",
  green: "#8BC53F",
  magenta: "#D4318F",
  navy: "#1A1F4B",
};
