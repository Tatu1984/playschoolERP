/** Framework-free helpers shared by the store, services and components. */

let counter = 0;

/** Collision-safe enough id for demo records; the backend will use cuid/uuid. */
export function newId(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Deterministic pseudo-random in [0,1) — keeps fixtures stable across renders. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.floor(seeded(seed) * arr.length) % arr.length];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function groupBy<T, K extends string>(arr: T[], key: (item: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function formatMoney(amount: number, currency = "₹"): string {
  return `${currency}${amount.toLocaleString("en-IN")}`;
}

export function formatCompact(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
