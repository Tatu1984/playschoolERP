/**
 * Push notifications to a parent's phone.
 *
 * One interface, three drivers, selected by configuration — the same shape as
 * the payment gateway and the mailer, and never branched on outside this file.
 *
 * The wire format is Expo's push service, which is what `DeviceToken.token`
 * has always been documented to hold. Expo fronts APNs and FCM, so this is one
 * HTTP call rather than two SDKs and a service-account key, and it is what the
 * (unbuilt) Expo app would register against.
 *
 * Two things here matter more than the transport:
 *
 *  * Nothing throws. A fan-out to 400 parents must not stop at the first dead
 *    handset — every message comes back with its own result, and the caller
 *    records each one. A provider that is not configured at all returns
 *    failures for everything rather than an exception, because "nobody was
 *    reached" is a fact the school needs written down, not an error swallowed
 *    somewhere up the stack.
 *  * A token the provider says is dead is reported as `retire: true`, so the
 *    caller can delete it. Dead tokens otherwise accumulate for ever and every
 *    future broadcast reports failures that mean nothing.
 */
import { logger } from "@/backend/utils/logger.util";
import { env } from "@/config/env";

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  /** Where tapping it should land. Small — Expo caps the payload at 4KB. */
  data?: Record<string, string>;
  /** CRITICAL broadcasts ask for the loudest treatment the platform allows. */
  urgent?: boolean;
}

export interface PushResult {
  token: string;
  ok: boolean;
  /** Provider's reason, kept short enough to store on a delivery row. */
  detail: string;
  /** The provider says this token will never work again — delete it. */
  retire: boolean;
}

export interface PushSender {
  readonly name: string;
  send(messages: PushMessage[]): Promise<PushResult[]>;
}

/** Expo accepts up to 100 messages per request. */
const BATCH = 100;

/** Anything else is an FCM/APNs token or a typo; either way Expo cannot use it. */
export function isExpoToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

class ExpoPushSender implements PushSender {
  readonly name = "expo";
  constructor(private accessToken: string) {}

  async send(messages: PushMessage[]): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      try {
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(
            batch.map((m) => ({
              to: m.token,
              title: m.title,
              body: m.body,
              data: m.data ?? {},
              sound: "default",
              priority: m.urgent ? "high" : "normal",
              // An emergency must survive a phone that has been asleep for a
              // day; ordinary chatter should expire rather than arrive stale.
              ttl: m.urgent ? 86_400 : 3_600,
            })),
          ),
        });

        if (!res.ok) {
          const detail = `push provider returned ${res.status}`;
          logger.error("Push provider refused a batch", undefined, { status: res.status });
          results.push(...batch.map((m) => failure(m.token, detail)));
          continue;
        }

        const payload = (await res.json()) as { data?: ExpoTicket[] };
        const tickets = payload.data ?? [];
        batch.forEach((m, index) => {
          const ticket = tickets[index];
          if (!ticket) {
            results.push(failure(m.token, "provider returned no ticket"));
            return;
          }
          if (ticket.status === "ok") {
            results.push({ token: m.token, ok: true, detail: "", retire: false });
            return;
          }
          const error = ticket.details?.error ?? ticket.message ?? "unknown provider error";
          results.push({
            token: m.token,
            ok: false,
            detail: error.slice(0, 200),
            // The app was uninstalled, or the token was reissued. It will never
            // work again, so the row goes.
            retire: ticket.details?.error === "DeviceNotRegistered",
          });
        });
      } catch (e) {
        // A network failure is not a dead token: these are worth retrying, so
        // nothing is retired.
        logger.error("Push provider was unreachable", e);
        results.push(...batch.map((m) => failure(m.token, "push provider unreachable")));
      }
    }

    return results;
  }
}

function failure(token: string, detail: string): PushResult {
  return { token, ok: false, detail, retire: false };
}

/** Development: the notification goes to the server log, not to a handset. */
class ConsolePushSender implements PushSender {
  readonly name = "console";

  async send(messages: PushMessage[]): Promise<PushResult[]> {
    for (const m of messages) {
      logger.info("Push (console driver — not actually sent)", {
        token: m.token,
        title: m.title,
        body: m.body,
      });
    }
    return messages.map((m) => ({ token: m.token, ok: true, detail: "", retire: false }));
  }
}

/**
 * Production with no provider configured. Every message is a recorded failure,
 * which is the truth: nobody's phone rang.
 */
class DisabledPushSender implements PushSender {
  readonly name = "disabled";

  async send(messages: PushMessage[]): Promise<PushResult[]> {
    return messages.map((m) => failure(m.token, "no push provider is configured"));
  }
}

function build(): PushSender {
  if (env.EXPO_ACCESS_TOKEN) return new ExpoPushSender(env.EXPO_ACCESS_TOKEN);

  if (env.isProd) {
    console.warn(
      "⚠️  No push provider configured — nothing reaches a phone, including " +
        "emergency broadcasts. Set EXPO_ACCESS_TOKEN to enable it.",
    );
    return new DisabledPushSender();
  }
  return new ConsolePushSender();
}

let active: PushSender = build();

/** See the note on `mailer` — a getter so tests can put a driver in front. */
export const pushSender: PushSender = {
  get name() {
    return active.name;
  },
  send(messages: PushMessage[]) {
    return active.send(messages);
  },
};

/** Tests only. Returns the driver that was in place, to put back afterwards. */
export function setPushSender(next: PushSender): PushSender {
  const previous = active;
  active = next;
  return previous;
}
