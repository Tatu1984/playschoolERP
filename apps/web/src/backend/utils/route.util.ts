/**
 * The boilerplate every route adapter in `src/app/api/**` would otherwise
 * repeat: pull the session, run the handler, turn anything thrown into a safe
 * JSON response.
 *
 * Route handlers stay thin on purpose — they parse, they delegate to a service,
 * they serialise. Business rules and RBAC live in the service layer, because
 * the mobile app hits the same services through the same routes and must not be
 * able to skip a check by calling a different path.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/backend/services/auth.service";
import type { SessionClaims } from "@/backend/utils/jwt.util";
import { toErrorResponse, UnauthorizedError } from "./error-handler.util";

export type Session = SessionClaims;

/** The session, or a 401 — for everything behind a login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

type Handler<C> = (req: NextRequest, ctx: C, session: Session) => Promise<unknown>;
type OpenHandler<C> = (req: NextRequest, ctx: C) => Promise<unknown>;

/**
 * Wrap an authenticated handler. Whatever it returns is the JSON body; return a
 * `NextResponse` directly when you need to control status or headers.
 */
export function authed<C>(fn: Handler<C>) {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    try {
      const session = await requireSession();
      const result = await fn(req, ctx, session);
      return result instanceof NextResponse ? result : NextResponse.json(result);
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}

/** Wrap a public handler (marketing forms, webhooks, catalogue reads). */
export function open<C>(fn: OpenHandler<C>) {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    try {
      const result = await fn(req, ctx);
      return result instanceof NextResponse ? result : NextResponse.json(result);
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}

/** `NextResponse.json(body, { status })` — shorthand for created/no-content. */
export function created(body: unknown): NextResponse {
  return NextResponse.json(body, { status: 201 });
}

/** Query-string helpers. Every list endpoint reads its filters the same way. */
export function q(req: NextRequest, key: string): string | undefined {
  return req.nextUrl.searchParams.get(key) ?? undefined;
}

export function qInt(req: NextRequest, key: string, fallback: number): number {
  const raw = req.nextUrl.searchParams.get(key);
  const n = raw === null ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function qBool(req: NextRequest, key: string): boolean | undefined {
  const raw = req.nextUrl.searchParams.get(key);
  if (raw === null) return undefined;
  return raw === "true" || raw === "1";
}
