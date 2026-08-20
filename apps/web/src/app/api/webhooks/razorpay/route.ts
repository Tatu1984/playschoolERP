import { NextRequest, NextResponse } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { paymentGateway } from "@/backend/integrations/payments";
import { toErrorResponse } from "@/backend/utils/error-handler.util";

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
    return toErrorResponse(e);
  }
}
