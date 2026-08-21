import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/backend/validators/auth.validator";
import {
  authService,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/backend/services/auth.service";
import { toErrorResponse } from "@/backend/utils/error-handler.util";
import {
  clearRateLimit,
  clientIp,
  enforceRateLimit,
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
} from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = loginSchema.parse(await req.json());
    // Counted two ways, because the two attacks look different. One address
    // trying many accounts is caught by the address; many addresses trying one
    // account — a spread-out attack on a known email — is caught by the email.
    const email = input.email.toLowerCase();
    await enforceRateLimit(LOGIN_IP_LIMIT, clientIp(req));
    await enforceRateLimit(LOGIN_EMAIL_LIMIT, email);

    const { user, token } = await authService.login(input);
    // Signing in successfully clears the count: a parent who mistyped their
    // password four times should not spend the next five minutes one slip away
    // from being locked out of their own account.
    await clearRateLimit(LOGIN_EMAIL_LIMIT, email);
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (e) {
    return toErrorResponse(e);
  }
}
