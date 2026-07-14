import { z } from "zod";

/**
 * Centralized, validated environment access.
 *
 * Rules:
 * - Never read `process.env.X` directly elsewhere; import `env` from here.
 * - Secrets fall back to an insecure dev default *only* outside production,
 *   and we warn loudly. In production a missing secret throws.
 */

const isProd = process.env.NODE_ENV === "production";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database (Prisma / Postgres — Neon in prod, docker Postgres locally)
  DATABASE_URL: z
    .string()
    .default("postgresql://playschool:playschool@localhost:5432/playschool"),

  // Session signing secret (HS256 JWT stored in an HttpOnly cookie)
  AUTH_SECRET: z.string().min(1).optional(),

  // CCTV short-lived view-token signing secret (separate from AUTH_SECRET)
  CCTV_TOKEN_SECRET: z.string().min(1).optional(),

  // Optional shared secret MediaMTX presents when calling our authorize hook
  CCTV_AUTHORIZE_SECRET: z.string().optional(),

  // Credentials the internal publisher (ffmpeg test stream / trusted ingest)
  // uses to publish to MediaMTX. `read` actions never use these.
  CCTV_PUBLISHER_USER: z.string().default("publisher"),
  CCTV_INTERNAL_SECRET: z.string().optional(),

  // Browser-facing MediaMTX endpoints for the parent viewer
  MEDIAMTX_WHEP_URL: z.string().default("http://localhost:8889"),
  MEDIAMTX_HLS_URL: z.string().default("http://localhost:8888"),

  // Legacy (marketing GMS) — kept working, unrelated to ERP
  ADMIN_PASSWORD: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment configuration");
}

const raw = parsed.data;

const DEV_SECRET = "dev-insecure-secret-change-me";

function requireSecret(name: string, value: string | undefined): string {
  if (value) return value;
  if (isProd) {
    throw new Error(`${name} must be set in production`);
  }
  console.warn(
    `⚠️  ${name} is not set — using an insecure development default. Set it before deploying.`,
  );
  return DEV_SECRET;
}

export const env = {
  ...raw,
  isProd,
  AUTH_SECRET: requireSecret("AUTH_SECRET", raw.AUTH_SECRET),
  CCTV_TOKEN_SECRET: requireSecret(
    "CCTV_TOKEN_SECRET",
    raw.CCTV_TOKEN_SECRET ?? raw.AUTH_SECRET,
  ),
  CCTV_INTERNAL_SECRET: requireSecret(
    "CCTV_INTERNAL_SECRET",
    raw.CCTV_INTERNAL_SECRET,
  ),
};

export type Env = typeof env;
