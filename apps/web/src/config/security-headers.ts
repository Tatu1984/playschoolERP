/**
 * The headers every response carries.
 *
 * This product embeds a live WebRTC feed of children. The sharpest missing
 * edge was `frame-ancestors`: with no policy at all, any site on the internet
 * could frame `/parent/cctv`, sit a transparent overlay on top, and let a
 * signed-in parent click through it — or simply put the feed on a page of its
 * own choosing. That one is enforced from today.
 *
 * The rest of the policy ships in report-only mode first, which is the honest
 * order of operations: a full `default-src 'self'` enforced blind against 100+
 * routes breaks something on a page nobody remembered, and it breaks it in a
 * parent's browser rather than in CI. Report-only collects the violations at
 * `/api/csp-report`, and the policy is promoted to enforced once the reports
 * are quiet. Everything else here — HSTS, nosniff, referrer, permissions — has
 * no such failure mode and is enforced immediately.
 *
 * Kept out of `next.config.ts` so it can be asserted in a test. A header set
 * that lives only in configuration is a header set that silently disappears in
 * an unrelated edit.
 */

/** `http://host:8889/whep` -> `http://host:8889`, and never throws on junk. */
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Where the browser is allowed to talk WebRTC and HLS.
 *
 * The WHEP handshake is a cross-origin POST from the parent's browser to
 * MediaMTX, so its origin has to be in `connect-src` or the video never
 * negotiates. These are read from the environment at build time: changing
 * `MEDIAMTX_WHEP_URL` needs a redeploy for the policy to follow it.
 */
function mediaOrigins(env: NodeJS.ProcessEnv): string[] {
  const origins = [originOf(env.MEDIAMTX_WHEP_URL), originOf(env.MEDIAMTX_HLS_URL)];
  return [...new Set(origins.filter((o): o is string => o !== null))];
}

function collapse(policy: string): string {
  return policy.replace(/\s{2,}/g, " ").trim();
}

/**
 * The directives worth enforcing before anyone has read a single violation
 * report. Each one either cannot break a page that was already working, or —
 * in the case of `frame-ancestors` — protects something that matters more than
 * the page it might break.
 */
export function enforcedCsp(env: NodeJS.ProcessEnv = process.env): string {
  const isProd = env.NODE_ENV === "production";
  return collapse(`
    frame-ancestors 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    ${isProd ? "upgrade-insecure-requests;" : ""}
  `);
}

/**
 * The policy we intend to enforce, reported on but not applied.
 *
 * `'unsafe-inline'` in `script-src` is not an oversight. The alternative is a
 * per-request nonce, and Next.js can only apply a nonce to a dynamically
 * rendered page — adopting it would turn every static marketing page into a
 * server render. The trade is deliberate: this policy does not stop an inline
 * injection, but it does stop an injected script from *loading code from* or
 * *sending anything to* an origin we did not list, which is what exfiltration
 * of a child's records would need.
 *
 * When Razorpay Checkout lands in the browser, it needs
 * `https://checkout.razorpay.com` in `script-src` and `frame-src`; it is not
 * listed yet because nothing loads it yet.
 */
export function reportOnlyCsp(env: NodeJS.ProcessEnv = process.env): string {
  const isDev = env.NODE_ENV === "development";
  const media = mediaOrigins(env);
  return collapse(`
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    media-src 'self' blob: ${media.join(" ")};
    connect-src 'self' ${media.join(" ")}${isDev ? " ws: wss:" : ""};
    frame-src 'self' https://www.google.com;
    worker-src 'self' blob:;
    manifest-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    report-uri /api/csp-report;
  `);
}

export interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * `next.config.ts` spreads this into `headers()` for every path.
 */
export function securityHeaders(env: NodeJS.ProcessEnv = process.env): SecurityHeader[] {
  const isProd = env.NODE_ENV === "production";

  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: enforcedCsp(env) },
    { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp(env) },

    // Superseded by frame-ancestors everywhere that matters, and still the only
    // thing a browser old enough to ignore CSP will honour. It costs a line.
    { key: "X-Frame-Options", value: "SAMEORIGIN" },

    // A .txt upload that a browser decides to read as HTML is a stored XSS.
    { key: "X-Content-Type-Options", value: "nosniff" },

    // Full URLs stay inside the origin. A path like
    // /parent/children/<id>/medical in a Referer header to a third party is a
    // disclosure on its own, before anyone opens the page.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

    // The CCTV viewer receives video, it never captures any: the camera and
    // microphone permissions this app needs are none. Everything else that
    // could identify or locate a user is denied for the same reason.
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "serial=()",
        "midi=()",
        "display-capture=()",
        "browsing-topics=()",
      ].join(", "),
    },
  ];

  // Ignored over plain HTTP, so this is only about not claiming something in
  // development that is not true there. Two years, subdomains included, and
  // preload-eligible — the parent portal has no HTTP-only surface to strand.
  if (isProd) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
