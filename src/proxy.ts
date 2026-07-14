import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifySession } from "@/backend/utils/jwt.util";
import { ROLES, ROLE_HOME, STAFF_ROLES, type Role } from "@/shared/constants/roles";

const ERP_SESSION_COOKIE = "ps_session";
const GMS_SESSION_COOKIE = "gms_session";

// ---- Legacy GMS (marketing gallery admin) — unchanged ----------------------
function verifyGmsToken(value: string | undefined): boolean {
  if (!value) return false;
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  try {
    const expected = crypto.createHmac("sha256", secret).update("gms-valid").digest("hex");
    if (expected.length !== value.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(value));
  } catch {
    return false;
  }
}

// ---- ERP role-gated areas --------------------------------------------------
// Prefix -> roles allowed to enter. SUPER_ADMIN can enter anything.
const ROLE_GATES: { prefix: string; allow: Role[] }[] = [
  { prefix: "/admin", allow: STAFF_ROLES },
  { prefix: "/teacher", allow: [ROLES.TEACHER, ...STAFF_ROLES] },
  { prefix: "/parent", allow: [ROLES.PARENT, ROLES.SUPER_ADMIN] },
];

// Authenticated JSON APIs (any logged-in user; fine-grained checks in handlers).
const AUTH_API_PREFIXES = ["/api/cctv"];

// Always public, even under a gated prefix. `/api/cctv/authorize` is called by
// the MediaMTX server (not a browser session) and carries its own token.
const PUBLIC_PATHS = new Set(["/api/cctv/authorize"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // --- Legacy GMS gating ---
  if (pathname.startsWith("/gms") || pathname.startsWith("/api/gms")) {
    if (
      pathname === "/gms/login" ||
      pathname === "/api/gms/login" ||
      pathname === "/api/gms/logout"
    ) {
      return NextResponse.next();
    }
    if (verifyGmsToken(req.cookies.get(GMS_SESSION_COOKIE)?.value)) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/gms")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/gms/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // --- ERP session gating ---
  const isAuthApi = AUTH_API_PREFIXES.some((p) => pathname.startsWith(p));
  const gate = ROLE_GATES.find((g) => pathname.startsWith(g.prefix));

  if (!gate && !isAuthApi) return NextResponse.next();

  const session = await verifySession(req.cookies.get(ERP_SESSION_COOKIE)?.value);

  if (!session) {
    if (isAuthApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (gate && !gate.allow.includes(session.role)) {
    // Logged in but wrong role — send to their own home.
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[session.role] ?? "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/gms/:path*",
    "/api/gms/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/parent/:path*",
    "/api/cctv/:path*",
  ],
};
