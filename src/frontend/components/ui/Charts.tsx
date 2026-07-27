"use client";

/**
 * Hand-rolled SVG charts. Deliberately dependency-free: the SoW's analytics
 * needs are bar / line / donut / radial only, and this keeps the bundle small
 * and the colours locked to the brand tokens.
 */
import type { SeriesPoint } from "@/shared/types/ops.types";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/shared/utils/common.util";

const SERIES_COLORS = ["#DC2638", "#F39A1E", "#2BAEEC", "#8BC53F", "#D4318F", "#1A1F4B"];

export function BarChart({
  data,
  height = 180,
  suffix = "",
  color = "#DC2638",
  className,
  compact = false,
}: {
  data: SeriesPoint[];
  height?: number;
  suffix?: string;
  color?: string;
  className?: string;
  compact?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
              {compact ? formatCompact(d.value) : d.value}
              {suffix}
            </span>
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${Math.max(3, (d.value / max) * (height - 28))}px`,
                background: `linear-gradient(180deg, ${color}, ${color}99)`,
              }}
              role="img"
              aria-label={`${d.label}: ${d.value}${suffix}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {data.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 160,
  suffix = "",
  color = "#2BAEEC",
  className,
}: {
  data: SeriesPoint[];
  height?: number;
  suffix?: string;
  color?: string;
  className?: string;
}) {
  const w = 300;
  const h = height;
  const pad = 8;
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = Math.max(1, max - min);
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = pad + i * step;
    const y = h - pad - ((d.value - min) / span) * (h - pad * 2);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1]?.x ?? pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} role="img">
        <defs>
          <linearGradient id={`lg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#lg-${color.slice(1)})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3" fill="#fff" stroke={color} strokeWidth="2">
            <title>{`${p.label}: ${p.value}${suffix}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between px-1">
        {data.map((d) => (
          <span key={d.label} className="text-[10px] text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  size = 160,
  thickness = 18,
  centerLabel,
  centerValue,
  className,
}: {
  data: SeriesPoint[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  // Pre-compute each arc's length and start offset so the render stays pure.
  const arcs = data.reduce<{ point: SeriesPoint; len: number; offset: number }[]>((acc, point) => {
    const len = (point.value / total) * c;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
    acc.push({ point, len, offset });
    return acc;
  }, []);

  return (
    <div className={cn("flex flex-wrap items-center gap-5", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-muted" />
          {arcs.map(({ point, len, offset }, i) => (
            <circle
              key={point.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            >
              <title>{`${point.label}: ${point.value}`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-xl font-bold tabular-nums">{centerValue ?? total}</span>
          {centerLabel && <span className="text-[10px] tracking-wide text-muted-foreground uppercase">{centerLabel}</span>}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              <span className="truncate text-muted-foreground">{d.label}</span>
            </span>
            <span className="font-semibold tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal skill meters — the progress-report visual. */
export function SkillBars({
  data,
  className,
  color = "#8BC53F",
}: {
  data: SeriesPoint[];
  className?: string;
  color?: string;
}) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{d.label}</span>
            <span className="font-semibold tabular-nums text-muted-foreground">{d.value}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${d.value}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Big circular percentage — attendance %, fee collection %, etc. */
export function RadialStat({
  value,
  label,
  size = 120,
  color = "#DC2638",
  suffix = "%",
}: {
  value: number;
  label: string;
  size?: number;
  color?: string;
  suffix?: string;
}) {
  const thickness = 10;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} stroke="currentColor" className="text-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={thickness}
            stroke={color}
            strokeDasharray={`${filled} ${c - filled}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-heading text-xl font-bold tabular-nums">
            {value}
            {suffix}
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
