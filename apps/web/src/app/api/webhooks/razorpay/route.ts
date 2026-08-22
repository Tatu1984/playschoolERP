import { NextRequest, NextResponse } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { paymentGateway } from "@/backend/integrations/payments";
import { AppError, toErrorResponse } from "@/backend/utils/error-handler.util";
import { logger } from "@/backend/utils/logger.util";
import { clientIp } from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

/**
 * Gateway webhook. No session — the HMAC signature over the raw body is the
 * authentication, so the body must be read as text and never re-serialised
 * before verifying.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const event = paymentGateway.parseWebhook(raw, req.headers.get("x-razorpay-signature"));
    await feeService.handleGatewayEvent(event);
    return NextResponse.json({ received: true });
  } catch (e) {
    // A signature that does not verify is a refusal, not a bug, so it would
    // otherwise leave nothing behind but a 400. It is worth an error-level
    // line and a tracker event all the same: nobody sends an unsigned
    // `payment.captured` by accident, and the thing being attempted is marking
    // invoices paid that nobody paid.
    if (e instanceof AppError && e.code === "bad_signature") {
      logger.error("Payment webhook signature did not verify", e, {
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent") ?? "",
      });
    }
    return toErrorResponse(e);
  }
}
