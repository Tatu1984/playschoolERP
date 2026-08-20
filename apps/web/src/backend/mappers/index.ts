/**
 * Prisma rows -> the shared types in `@climbkiddo/shared`.
 *
 * Everything crossing the wire goes through here. Two reasons that matters:
 *
 *  * Dates. The shared types use ISO strings throughout, because the same
 *    record has to survive JSON to a browser, to Expo, and back. A `Date`
 *    object leaking into a response would serialise differently depending on
 *    who did it.
 *  * Secrets. A camera's RTSP URL, a teacher's internal note, a user's password
 *    hash — the mapper is the single place that decides what a client sees, so
 *    "did we ever expose that?" has one answer, not forty.
 */
import type { MediaRef } from "@/shared/types/common.types";

export const iso = (d: Date): string => d.toISOString();
export const isoOrNull = (d: Date | null): string | null => (d ? d.toISOString() : null);

/** Json columns come back as `unknown`; the schema comment says what shape. */
export const asMedia = (v: unknown): MediaRef[] => (Array.isArray(v) ? (v as MediaRef[]) : []);
export const asJson = <T>(v: unknown, fallback: T): T => (v == null ? fallback : (v as T));

export * from "./school.mapper";
export * from "./engagement.mapper";
export * from "./learning.mapper";
export * from "./ops.mapper";
