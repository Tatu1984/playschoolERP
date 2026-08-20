import type { ISODate } from "../types/common.types";

export const MS_DAY = 86_400_000;

/** Local-midnight of today, the anchor every relative fixture date hangs off. */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" in local time (never `toISOString`, which shifts to UTC). */
export function dateKey(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}

export function addDays(d: Date | string, days: number): Date {
  const date = typeof d === "string" ? new Date(d) : new Date(d.getTime());
  date.setDate(date.getDate() + days);
  return date;
}

export function daysAgo(n: number, hour = 9, minute = 0): ISODate {
  const d = addDays(today(), -n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function daysAhead(n: number, hour = 9, minute = 0): ISODate {
  return daysAgo(-n, hour, minute);
}

export function hoursAgo(n: number): ISODate {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

export function minutesAgo(n: number): ISODate {
  return new Date(Date.now() - n * 60_000).toISOString();
}

export function nowIso(): ISODate {
  return new Date().toISOString();
}

/** Age in years from a date of birth, one decimal place. */
export function ageFrom(dob: ISODate): number {
  const years = (Date.now() - new Date(dob).getTime()) / (MS_DAY * 365.25);
  return Math.round(years * 10) / 10;
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return dateKey(a) === dateKey(b);
}

/** Monday-first list of the 7 day keys for the week containing `ref`. */
export function weekKeys(ref: Date = today()): string[] {
  const day = (ref.getDay() + 6) % 7;
  const monday = addDays(ref, -day);
  return Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
}

/** "HH:mm" now, used for school-hours comparisons. */
export function clockNow(): string {
  const d = new Date();
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

export function withinWindow(from: string, to: string, at = clockNow()): boolean {
  return at >= from && at <= to;
}
