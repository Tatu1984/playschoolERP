/**
 * Where an error goes besides the log.
 *
 * `logger.error` has always had a seam for this (`setErrorReporter`) and
 * nothing was plugged into it, which means every unhandled failure in
 * production lands in a log stream that nobody is watching at three in the
 * morning. This is what gets plugged in, following the same one-interface,
 * configuration-selected shape as the payment gateway, the mailer and push.
 *
 * The Sentry driver speaks Sentry's envelope endpoint directly rather than
 * through `@sentry/nextjs`. That is a deliberate trade and worth stating: no
 * source-map symbolication, no breadcrumbs, no performance tracing — in return
 * for no SDK in the dependency tree of a product that just spent a day getting
 * that tree to zero advisories. If any of those become worth having, the SDK
 * slots in as another driver in this file and nothing outside it changes.
 *
 * Nothing here throws or awaits in the request path. A tracker that is down
 * must not turn a handled 500 into a hung request.
 */
import { logger, type LogFields } from "@/backend/utils/logger.util";
import { env } from "@/config/env";

export interface ErrorReport {
  error: unknown;
  fields: LogFields;
}

export interface ErrorTracker {
  readonly name: string;
  /** Fire-and-forget by contract: callers do not await this. */
  report(report: ErrorReport): void;
}

/** `https://<key>@<host>/<projectId>` — Sentry's DSN, parsed once at boot. */
interface Dsn {
  key: string;
  host: string;
  projectId: string;
  protocol: string;
}

export function parseDsn(dsn: string): Dsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return {
      key: url.username,
      host: url.host,
      projectId,
      protocol: url.protocol.replace(":", ""),
    };
  } catch {
    return null;
  }
}

function errorParts(error: unknown): { type: string; value: string; stack?: string } {
  if (error instanceof Error) {
    return { type: error.name || "Error", value: error.message, stack: error.stack };
  }
  return { type: "Error", value: typeof error === "string" ? error : JSON.stringify(error) };
}

/**
 * Sentry's store format, hand-built.
 *
 * The stack goes over as a single `raw` frame rather than parsed frames: it is
 * enough to read in the issue body, and inventing a frame parser here would be
 * the sort of code that is wrong in exactly the situation it is needed.
 */
class SentryTracker implements ErrorTracker {
  readonly name = "sentry";
  private endpoint: string;

  constructor(private dsn: Dsn, private release: string) {
    this.endpoint = `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/envelope/`;
  }

  report({ error, fields }: ErrorReport): void {
    const { type, value, stack } = errorParts(error);
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const sentAt = new Date().toISOString();

    const event = {
      event_id: eventId,
      timestamp: sentAt,
      platform: "node",
      level: "error",
      release: this.release,
      environment: env.NODE_ENV,
      logger: "climbkiddo",
      // `fields` has already been through the logger's redaction — no
      // passwords, no tokens, no email addresses reach a third party.
      extra: fields,
      exception: {
        values: [{ type, value, stacktrace: stack ? { frames: [{ filename: "<stack>", raw: stack }] } : undefined }],
      },
    };

    const envelope =
      JSON.stringify({ event_id: eventId, sent_at: sentAt, dsn: undefined }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event) +
      "\n";

    void fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-sentry-envelope",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_client=climbkiddo/1, sentry_key=${this.dsn.key}`,
      },
      body: envelope,
      // The error is already in the log; a slow tracker must not hold anything.
      keepalive: true,
    }).catch(() => {
      // Reporting the failure to report would recurse. The log already has the
      // original error, which is the thing that matters.
    });
  }
}

/** Development: the logger has already printed it. Nothing more to do. */
class ConsoleTracker implements ErrorTracker {
  readonly name = "console";
  report(): void {}
}

/** Production with nothing configured. Says so once, at boot. */
class DisabledTracker implements ErrorTracker {
  readonly name = "disabled";
  report(): void {}
}

function build(): ErrorTracker {
  if (env.SENTRY_DSN) {
    const dsn = parseDsn(env.SENTRY_DSN);
    if (dsn) return new SentryTracker(dsn, env.RELEASE_ID);
    console.warn("⚠️  SENTRY_DSN is not a valid DSN — error reporting is off.");
    return new DisabledTracker();
  }

  if (env.isProd) {
    console.warn(
      "⚠️  No error tracker configured — production errors reach the log and " +
        "nowhere else. Set SENTRY_DSN to enable it.",
    );
    return new DisabledTracker();
  }
  return new ConsoleTracker();
}

let active: ErrorTracker = build();

export const errorTracker: ErrorTracker = {
  get name() {
    return active.name;
  },
  report(report: ErrorReport) {
    active.report(report);
  },
};

/** Tests only. Returns the tracker that was in place, to put back afterwards. */
export function setErrorTracker(next: ErrorTracker): ErrorTracker {
  const previous = active;
  active = next;
  return previous;
}

/**
 * What is switched on in this deployment, in one line at boot.
 *
 * Every integration in this codebase refuses rather than pretends when it is
 * unconfigured, which is right — but a refusal nobody reads is a surprise
 * saved up for later. `payments: "disabled"` in production means fees are
 * quietly uncollectable; `push: "disabled"` means an emergency broadcast
 * reaches nobody's phone. Those belong in the first line of the log, where a
 * deploy check can see them.
 */
export function describeIntegrations(drivers: {
  payments: string;
  /**
   * Named `mailer`, not `email`: the logger redacts any field whose name looks
   * personal, and `email: "disabled"` came out as `email: "[redacted]"` —
   * which reads like a secret rather than like a switched-off integration.
   */
  mailer: string;
  push: string;
}): void {
  const off = Object.entries(drivers).filter(([, name]) => name === "disabled");
  const fields = { ...drivers, errors: active.name, environment: env.NODE_ENV };

  if (off.length > 0 && env.isProd) {
    logger.warn(`Starting with ${off.length} integration(s) switched off`, fields);
    return;
  }
  logger.info("Integrations", fields);
}
