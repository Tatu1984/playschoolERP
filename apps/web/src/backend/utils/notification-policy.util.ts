/**
 * Whether a particular notification may use a particular channel.
 *
 * Kept pure and away from the database so the rules can be read in one place
 * and tested without a broadcast, a parent, or a provider. Every decision
 * carries a reason, because the reason is what gets written to the delivery
 * record — after an incident the useful question is not "did it fail" but "who
 * did not get it, and why".
 */
import type { NotificationChannel } from "@/shared/types/ops.types";

export interface RecipientPreferences {
  channels: Partial<Record<NotificationChannel, boolean>>;
  mutedKinds: string[];
  /** Local wall-clock window, e.g. { from: "21:30", to: "07:00" }. */
  quietHours: { from: string; to: string } | null;
}

export interface PolicyInput {
  channel: NotificationChannel;
  kind: string;
  prefs: RecipientPreferences;
  /**
   * A CRITICAL safety broadcast. Overrides quiet hours and muted kinds — a
   * lockdown at 2am is exactly the message quiet hours must not swallow — but
   * not a channel the recipient switched off outright. Those are different
   * instructions: "not now" and "not this topic" are about timing, while
   * turning a channel off is about the address itself. Switching one off still
   * shows up in the delivery record, so a school can see who it could not reach
   * and go and telephone them.
   */
  urgent: boolean;
  /** Minutes since midnight where the recipient is, 0–1439. */
  localMinutes: number;
}

export interface PolicyDecision {
  send: boolean;
  /** Empty when sending; a short, storable reason when not. */
  reason: string;
}

const SEND: PolicyDecision = { send: true, reason: "" };

export function decideChannel(input: PolicyInput): PolicyDecision {
  const { channel, kind, prefs, urgent, localMinutes } = input;

  // The in-app row is the notification itself, not an interruption: it is what
  // the bell menu reads. Suppressing it would mean the parent opens the portal
  // after an emergency and finds no trace of it.
  if (channel === "IN_APP") return SEND;

  if (prefs.channels[channel] === false) {
    return { send: false, reason: "recipient turned this channel off" };
  }

  if (!urgent && prefs.mutedKinds.includes(kind)) {
    return { send: false, reason: `recipient muted ${kind} notifications` };
  }

  if (!urgent && prefs.quietHours && inWindow(prefs.quietHours, localMinutes)) {
    return { send: false, reason: "inside the recipient's quiet hours" };
  }

  return SEND;
}

/**
 * Is `minutes` inside the window? Windows wrap midnight — 21:30 to 07:00 is
 * the common one and is two ranges, not one — and a window whose ends are equal
 * is treated as empty rather than as the whole day, because "quiet from 09:00
 * to 09:00" is a mistake, and reading it as "never notify me again" would be
 * the expensive way to interpret it.
 */
export function inWindow(window: { from: string; to: string }, minutes: number): boolean {
  const from = parseHhMm(window.from);
  const to = parseHhMm(window.to);
  if (from === null || to === null || from === to) return false;
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

function parseHhMm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

/**
 * Minutes since midnight in `timeZone`. The school's zone, not the server's:
 * a Vercel function runs in UTC, and quiet hours set to 21:30 by a parent in
 * Kolkata would otherwise start at three in the morning.
 */
export function localMinutesIn(timeZone: string, at: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(at);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    // "24:00" is a legal formatToParts answer for midnight in some locales.
    return (hour % 24) * 60 + minute;
  } catch {
    // An unknown zone must not stop a broadcast. UTC is wrong by hours, which
    // is better than throwing inside a fan-out to four hundred parents.
    return at.getUTCHours() * 60 + at.getUTCMinutes();
  }
}
