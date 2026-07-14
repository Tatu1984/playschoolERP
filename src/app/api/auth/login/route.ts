import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/backend/validators/auth.validator";
import {
  authService,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/backend/services/auth.service";
import { toErrorResponse } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = loginSchema.parse(await req.json());
    const { user, token } = await authService.login(input);
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (e) {
    return toErrorResponse(e);
  }
}
