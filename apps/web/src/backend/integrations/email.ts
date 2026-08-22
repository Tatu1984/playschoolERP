/**
 * Transactional email.
 *
 * One interface, three drivers, chosen by configuration exactly the way the
 * payment gateway is — and for the same reason. Nothing outside this file may
 * branch on which driver is running.
 *
 * The console driver is not a mock in the pretending sense: it writes the whole
 * message, reset link included, to the server log, so the recovery flow is
 * walkable on a laptop with no account anywhere. What it must never do is run
 * in production. A parent who is locked out and is told "check your inbox"
 * while the mail went to a log file has been failed twice — once by the outage
 * and once by being lied to about it. So in production an unconfigured mailer
 * is switched *off*: the endpoint refuses with something the parent can act on,
 * which is to telephone the school.
 */
import { AppError } from "@/backend/utils/error-handler.util";
import { logger } from "@/backend/utils/logger.util";
import { env } from "@/config/env";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Always required. Some parents read mail as plain text, and so do spam filters. */
  text: string;
  html?: string;
}

export interface Mailer {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

class ResendMailer implements Mailer {
  readonly name = "resend";
  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });

    if (!res.ok) {
      // The provider's body can quote the recipient address back at us, so it
      // is read for the log and never for the response.
      const detail = await res.text().catch(() => "");
      logger.error("Email provider refused the message", undefined, {
        status: res.status,
        detail: detail.slice(0, 500),
      });
      throw new AppError("Could not send the email just now", 502, "email_failed");
    }
  }
}

/** Development and tests: the message goes to the log, in full, on purpose. */
class ConsoleMailer implements Mailer {
  readonly name = "console";

  async send(message: EmailMessage): Promise<void> {
    logger.info("Email (console driver — not actually sent)", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}

/** Production with no provider configured. */
class DisabledMailer implements Mailer {
  readonly name = "disabled";

  async send(): Promise<void> {
    throw new AppError(
      "Email is not set up on this deployment — please call the school office",
      503,
      "email_disabled",
    );
  }
}

function build(): Mailer {
  if (env.RESEND_API_KEY) return new ResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM);

  if (env.isProd) {
    console.warn(
      "⚠️  No email provider configured — password reset is switched off. " +
        "Set RESEND_API_KEY (and EMAIL_FROM) to enable it.",
    );
    return new DisabledMailer();
  }
  return new ConsoleMailer();
}

let active: Mailer = build();

/**
 * The mailer everything sends through. A getter rather than a const so tests
 * can put a capturing driver in front of it — the same seam `setErrorReporter`
 * gives the logger, and for the same reason: the alternative is a test that
 * reimplements the send path and then agrees with itself.
 */
export const mailer: Mailer = {
  get name() {
    return active.name;
  },
  send(message: EmailMessage) {
    return active.send(message);
  },
};

/** Tests only. Returns the driver that was in place, to put back afterwards. */
export function setMailer(next: Mailer): Mailer {
  const previous = active;
  active = next;
  return previous;
}
