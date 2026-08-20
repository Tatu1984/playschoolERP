import { NextRequest } from "next/server";
import { z } from "zod";
import { feeService } from "@/backend/services/fee.service";
import { paymentGateway } from "@/backend/integrations/payments";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";
import { ForbiddenError } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

const schema = z.object({
  orderId: z.string().min(1),
  invoiceId: z.string().min(1),
  amount: z.number().int().positive(),
  method: z.enum(["UPI", "CARD", "NETBANKING"]),
});

/**
 * Stands in for the gateway's callback while no real gateway is configured, so
 * the whole fee flow is demoable end to end.
 *
 * It exists only when the mock driver is active — configure Razorpay and this
 * route starts refusing, because in production the only thing that may move
 * money is a signed webhook.
 *
 * It still goes the long way round: build the event the gateway would send,
 * sign it with the same HMAC, and verify it. The client never gets to declare
 * a payment; it only gets to ask the fake gateway to behave like the real one.
 */
export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  if (paymentGateway.name !== "mock") {
    throw new ForbiddenError("A real payment gateway is configured — pay through it");
  }
  const scope = await resolveScope(session);
  const { orderId, invoiceId, amount, method } = schema.parse(await req.json());

  // Proves this login may pay this invoice, and that the amount is sane.
  await feeService.createOrder(scope, invoiceId, amount);

  const body = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_mock_${orderId}`,
          order_id: orderId,
          amount: amount * 100,
          method: method.toLowerCase(),
          notes: { invoiceId, studentId: scope.userId },
        },
      },
    },
  });
  const event = paymentGateway.parseWebhook(body, paymentGateway.sign(body));
  await feeService.handleGatewayEvent(event);

  return { invoice: await feeService.getInvoice(scope, invoiceId) };
});
