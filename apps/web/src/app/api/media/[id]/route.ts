import { NextRequest, NextResponse } from "next/server";
import { mediaService } from "@/backend/services/media.service";
import { getSession } from "@/backend/services/auth.service";
import { toErrorResponse, UnauthorizedError } from "@/backend/utils/error-handler.util";
import { verifyMediaToken } from "@/backend/utils/jwt.util";
import { resolveScope } from "@/backend/utils/scope.util";
import { authRepository } from "@/backend/repositories/auth.repository";
import type { Role } from "@/shared/constants/roles";

export const runtime = "nodejs";

/**
 * Serve a photograph of a child.
 *
 * Two ways in, and no third:
 *
 *  * A session cookie, which the portal sends with every `<img>` request. The
 *    scope check then decides — a parent sees a photograph only through a
 *    published post one of their own children is tagged on.
 *  * A short-lived signed token naming this one object and the user it was
 *    minted for, for clients that cannot send the cookie. It is re-checked
 *    against the scope too: a token minted before a child left the school must
 *    not outlive the access it was minted under.
 *
 * There is no unauthenticated path. The bytes live in a private blob, so there
 * is no URL to leak in the first place — this route is the only door.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const scope = await scopeFor(req);
    const { body, contentType } = await mediaService.read(scope, id);

    return new NextResponse(Buffer.from(body), {
      headers: {
        "content-type": contentType,
        "content-length": String(body.length),
        // Private, so a shared cache never holds one child's photograph and
        // hands it to the next request. The browser may keep it briefly:
        // re-fetching every photograph on every scroll is its own problem.
        "cache-control": "private, max-age=300, must-revalidate",
        // Belt and braces against a crafted file that sniffs as something else.
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/** The session, or a token that stands in for one. */
async function scopeFor(req: NextRequest) {
  const session = await getSession();
  if (session) return resolveScope(session);

  const claims = await verifyMediaToken(req.nextUrl.searchParams.get("token"));
  if (!claims) throw new UnauthorizedError();

  // The token names a user; the user's access is re-derived now rather than
  // trusted from when the token was signed.
  const user = await authRepository.findById(claims.sub);
  if (!user || !user.active) throw new UnauthorizedError();

  return resolveScope({
    sub: user.id,
    role: user.role as Role,
    email: user.email,
    name: user.name,
    branchId: user.branchId,
  });
}
