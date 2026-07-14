import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/backend/validators/auth.validator";
import {
  authService,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/backend/services/auth.service";
import { toErrorResponse } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = registerSchema.parse(await req.json());
    await authService.register(input);
    // Auto-login the newly registered parent.
    const { user, token } = await authService.login({
      email: input.email,
      password: input.password,
    });
    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (e) {
    return toErrorResponse(e);
  }
}
