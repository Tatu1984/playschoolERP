import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/backend/validators/auth.validator";
import { passwordResetService } from "@/backend/services/password-reset.service";
import { toErrorResponse } from "@/backend/utils/error-handler.util";
import { clientIp, enforceRateLimit, RESET_SUBMIT_LIMIT } from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

/**
 * Is this link still good? Used by the reset page to decide between the form
 * and "this link has expired", so nobody types a new password twice into a
 * page that was never going to work.
 *
 * It is not a gate — POST re-checks everything — and it says only yes or no.
 * Notably it does not say whose account the token belongs to: the token is in a
 * URL, and URLs end up in browser history, shoulder-surfing distance, and the
 * occasional screenshot to a family group.
 */
export async function GET(req: NextRequest) {
  try {
    await enforceRateLimit(RESET_SUBMIT_LIMIT, clientIp(req));
    const token = req.nextUrl.searchParams.get("token") ?? "";
    return NextResponse.json({ valid: await passwordResetService.check(token) });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/**
 * Set the new password.
 *
 * No session is issued on success. Someone resetting a password may be doing it
 * because another person has the account; the last thing to do at that moment
 * is hand out a fresh session to whoever is holding the link. They sign in.
 */
export async function POST(req: NextRequest) {
  try {
    await enforceRateLimit(RESET_SUBMIT_LIMIT, clientIp(req));
    const { token, password } = resetPasswordSchema.parse(await req.json());
    await passwordResetService.complete(token, password);
    return NextResponse.json({ message: "Your password has been changed. Please sign in." });
  } catch (e) {
    return toErrorResponse(e);
  }
}
