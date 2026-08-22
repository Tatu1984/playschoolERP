/**
 * What the server says about itself.
 *
 * In production every line is a single JSON object on stdout, because that is
 * what Vercel and every log aggregator behind it can actually search: "show me
 * the 500s from the fees module last Tuesday" is a query against fields, not a
 * grep against prose. In development the same call prints something a person
 * can read at a glance.
 *
 * Two rules this file exists to enforce:
 *
 *  * Errors are serialised, never interpolated. `${err}` throws away the stack
 *    and the cause, which are the only parts worth having at three in the
 *    morning.
 *  * Fields are redacted on the way out. This is a product holding children's
 *    medical records and their parents' phone numbers, and the easiest way to
 *    leak them is for someone to log a whole request body while debugging and
 *    never take it out again. Known-sensitive keys never reach the output.
 */
import { env } from "@/config/env";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [key: string]: unknown;
}

/**
 * Keys whose values are never printed, matched case-insensitively anywhere in
 * the key. Deliberately blunt: a false positive costs a debugging session, a
 * false negative costs somebody's password in a log aggregator for ever.
 */
const SECRET_KEY = /pass|secret|token|auth|cookie|session|otp|hash|key$/i;

/** Keys that identify a person. Kept out of logs unless explicitly hashed. */
const PERSONAL_KEY = /email|phone|address|dob|medical|allerg|diagnos/i;

const REDACTED = "[redacted]";

function serialiseError(err: unknown): LogFields {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err.cause === undefined ? {} : { cause: serialiseError(err.cause) }),
    };
  }
  return { message: String(err) };
}

/**
 * Walk the fields, blanking anything sensitive. Depth-limited because a log
 * call must never be the thing that hangs a request on a cyclic object.
 */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[deep]";
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Error) return serialiseError(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));

  const out: LogFields = {};
  for (const [k, v] of Object.entries(value as LogFields)) {
    out[k] = SECRET_KEY.test(k) || PERSONAL_KEY.test(k) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

/**
 * Where errors go besides the log. Left as a seam rather than a dependency:
 * point it at Sentry (or whatever) from instrumentation and every
 * `logger.error` in the codebase starts reporting, with nothing else to change.
 */
type ErrorReporter = (err: unknown, fields: LogFields) => void;
let reportError: ErrorReporter | null = null;

export function setErrorReporter(reporter: ErrorReporter | null): void {
  reportError = reporter;
}

function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
  const safe = redact(fields) as LogFields;
  const write = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (env.isProd) {
    // One JSON object per line. No pretty-printing: a multi-line log entry is
    // several entries as far as most collectors are concerned.
    write(JSON.stringify({ level, message, time: new Date().toISOString(), ...safe }));
    return;
  }

  const tag = { debug: "·", info: "→", warn: "⚠", error: "✖" }[level];
  write(`${tag} ${message}`, Object.keys(safe).length ? safe : "");
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    // Debug is noise in production; the level exists for local work.
    if (!env.isProd) emit("debug", message, fields);
  },

  info(message: string, fields?: LogFields) {
    emit("info", message, fields);
  },

  warn(message: string, fields?: LogFields) {
    emit("warn", message, fields);
  },

  /**
   * Something went wrong that nobody asked for. Takes the error itself rather
   * than a description of it, so the stack survives.
   */
  error(message: string, err?: unknown, fields: LogFields = {}) {
    const withError = err === undefined ? fields : { ...fields, error: serialiseError(err) };
    emit("error", message, withError);
    if (reportError) {
      try {
        // Redacted first. The reporter sends this to somebody else's servers,
        // so it must not be the one path where a password or a parent's email
        // address leaves the building — which is exactly what it was while
        // nothing was plugged into the seam and nobody could tell.
        reportError(err, redact(fields) as LogFields);
      } catch {
        // A broken error reporter must not become the error. Swallowing here is
        // the one place it is right: the log line above already went out.
      }
    }
  },
};
