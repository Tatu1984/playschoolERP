import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/backend/validators/auth.validator";
import { passwordResetService } from "@/backend/services/password-reset.service";
import { toErrorResponse } from "@/backend/utils/error-handler.util";
import {
  clientIp,
  enforceRateLimit,
  RESET_REQUEST_EMAIL_LIMIT,
  RESET_REQUEST_IP_LIMIT,
} from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

/**
 * Ask for a reset link.
 *
 * Always 202, always the same body. Whether the address belongs to a parent at
 * this school is not something a stranger gets to learn by trying — and the
 * form has been promising exactly that in its small print while the endpoint
 * did not exist at all.
 *
 * The rate limits are counted before anything is looked up, so the response to
 * a limited caller does not depend on the account either.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = forgotPasswordSchema.parse(await req.json());
    const normalised = email.toLowerCase();

    await enforceRateLimit(RESET_REQUEST_IP_LIMIT, clientIp(req));
    await enforceRateLimit(RESET_REQUEST_EMAIL_LIMIT, normalised);

    await passwordResetService.request(normalised, clientIp(req));

    return NextResponse.json(
      { message: "If that address has an account, a reset link is on its way." },
      { status: 202 },
    );
  } catch (e) {
    return toErrorResponse(e);
  }
}
