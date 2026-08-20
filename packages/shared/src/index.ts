/**
 * `@climbkiddo/shared` — the contract every surface agrees on.
 *
 * Types, role/permission constants and the demo fixtures live here so the web
 * app (`apps/web`), the Expo app (`apps/mobile`) and the Prisma seed all speak
 * the same language. Nothing in this package may import from an app.
 */
export * from "./types";
export * from "./constants/roles";
export * from "./constants/permissions";
export * from "./utils/common.util";
export * from "./utils/date.util";
