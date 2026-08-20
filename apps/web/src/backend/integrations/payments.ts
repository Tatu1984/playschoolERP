/**
 * Payment gateway (SoW §6.3, §7.10).
 *
 * One interface, two drivers. The Razorpay driver is the real thing — order
 * creation over their REST API and HMAC-SHA256 webhook verification exactly as
 * they document it. The mock driver produces the same shapes locally so the
 * whole fee flow (checkout -> webhook -> receipt) is exercisable without an
 * account, and signs its own webhooks with the same HMAC so the verification
 * path is genuinely tested rather than skipped.
 *
 * Selection is by configuration, not by code: set RAZORPAY_KEY_ID and
 * RAZORPAY_KEY_SECRET and the real driver takes over with nothing else to
 * change. Never branch on the driver outside this file.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/backend/utils/error-handler.util";

export interface PaymentOrder {
  /** Gateway order id — what the checkout SDK is handed. */
  id: string;
  /** Paise (Razorpay's unit), i.e. rupees * 100. */
  amount: number;
  currency: string;
  receipt: string;
  keyId: string;
  /** True when no real gateway is configured, so the UI can say so. */
  mock: boolean;
}

export interface PaymentEvent {
  orderId: string;
  paymentId: string;
  /** Rupees. */
  amount: number;
  status: "captured" | "failed";
  method: string;
  /**
   * The notes we attached when creating the order. This is how a webhook knows
   * which invoice it belongs to — never guess from timing or amount.
   */
  notes: Record<string, string>;
}

export interface PaymentGateway {
  readonly name: string;
  createOrder(input: { amountRupees: number; receipt: string; notes?: Record<string, string> }): Promise<PaymentOrder>;
  /** Throws if the signature does not match; returns the normalised event. */
  parseWebhook(rawBody: string, signature: string | null): PaymentEvent;
  /** Sign a body the way the gateway would — used by the mock checkout. */
  sign(rawBody: string): string;
}

const secretFor = (s: string | undefined) => s ?? "mock-webhook-secret";

function verify(rawBody: string, signature: string | null, secret: string): void {
  if (!signature) throw new AppError("Missing webhook signature", 400, "bad_signature");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // Constant-time compare: a length check first, because timingSafeEqual
  // throws on mismatched lengths and that itself would leak.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError("Webhook signature did not match", 400, "bad_signature");
  }
}

function normalise(payload: unknown): PaymentEvent {
  const p = payload as {
    event?: string;
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };
  const entity = p.payload?.payment?.entity ?? {};
  const notes = (entity.notes ?? {}) as Record<string, string>;
  return {
    orderId: String(entity.order_id ?? ""),
    paymentId: String(entity.id ?? ""),
    amount: Math.round(Number(entity.amount ?? 0) / 100),
    status: p.event === "payment.failed" ? "failed" : "captured",
    method: String(entity.method ?? "UPI").toUpperCase(),
    notes,
  };
}

class RazorpayGateway implements PaymentGateway {
  readonly name = "razorpay";
  constructor(
    private keyId: string,
    private keySecret: string,
    private webhookSecret: string,
  ) {}

  async createOrder(input: { amountRupees: number; receipt: string; notes?: Record<string, string> }) {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: input.amountRupees * 100,
        currency: "INR",
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
    });
    if (!res.ok) {
      throw new AppError(`Payment gateway refused the order (${res.status})`, 502, "gateway_error");
    }
    const order = (await res.json()) as { id: string; amount: number; currency: string };
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: input.receipt,
      keyId: this.keyId,
      mock: false,
    };
  }

  parseWebhook(rawBody: string, signature: string | null): PaymentEvent {
    verify(rawBody, signature, this.webhookSecret);
    return normalise(JSON.parse(rawBody));
  }

  sign(rawBody: string): string {
    return createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }
}

class MockGateway implements PaymentGateway {
  readonly name = "mock";
  constructor(private webhookSecret: string) {}

  async createOrder(input: { amountRupees: number; receipt: string }) {
    return {
      id: `order_mock_${Date.now().toString(36)}`,
      amount: input.amountRupees * 100,
      currency: "INR",
      receipt: input.receipt,
      keyId: "rzp_test_mock",
      mock: true,
    };
  }

  parseWebhook(rawBody: string, signature: string | null): PaymentEvent {
    verify(rawBody, signature, this.webhookSecret);
    return normalise(JSON.parse(rawBody));
  }

  sign(rawBody: string): string {
    return createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }
}

function build(): PaymentGateway {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (id && secret) {
    return new RazorpayGateway(id, secret, secretFor(process.env.RAZORPAY_WEBHOOK_SECRET));
  }
  return new MockGateway(secretFor(process.env.RAZORPAY_WEBHOOK_SECRET));
}

export const paymentGateway: PaymentGateway = build();
