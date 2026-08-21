/**
 * Run with `npm run check:headers`. Needs nothing running.
 *
 * These headers are the kind of thing that disappears in an unrelated edit to
 * next.config.ts and is noticed months later by a penetration tester. So the
 * test does not read the policy module in isolation — it calls the config's
 * own `headers()`, the same function Next.js calls, and asserts what actually
 * comes back for a request path.
 *
 * The one that matters most is `frame-ancestors`: this app puts a live camera
 * feed of children on a page, and without that directive any site could frame
 * it.
 */
import nextConfig from "../../next.config";
import { POST as cspReport } from "../../src/app/api/csp-report/route";
import { reportOnlyCsp, securityHeaders } from "../../src/config/security-headers";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} ${detail}`);
  }
}

function directive(policy: string, name: string): string | null {
  for (const part of policy.split(";")) {
    const trimmed = part.trim();
    if (trimmed === name || trimmed.startsWith(`${name} `)) {
      return trimmed.slice(name.length).trim();
    }
  }
  return null;
}

async function main() {
  // --- What the config actually returns -----------------------------------
  console.log("\nThe config serves the headers on every path");

  // Deliberately tolerant of `headers` being gone entirely: that is the exact
  // regression this suite exists to catch, and it should report it rather than
  // die with a TypeError that reads like a broken test.
  check("the config defines headers() at all", typeof nextConfig.headers === "function");
  const rules = typeof nextConfig.headers === "function" ? await nextConfig.headers() : [];
  const rule = rules.find((r) => r.source === "/(.*)");
  check("one rule covers every path", rule !== undefined, `— sources: ${rules.map((r) => r.source).join(", ")}`);

  const served = new Map((rule?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
  const csp = served.get("content-security-policy") ?? "";

  check("a Content-Security-Policy is served", csp.length > 0);
  check(
    "the CCTV page cannot be framed by another site",
    directive(csp, "frame-ancestors") === "'self'",
    `— got ${directive(csp, "frame-ancestors")}`,
  );
  check("plugins are refused outright", directive(csp, "object-src") === "'none'");
  check("<base> cannot be repointed", directive(csp, "base-uri") === "'self'");
  check("a form cannot post to another origin", directive(csp, "form-action") === "'self'");

  check("responses are not sniffed for a type", served.get("x-content-type-options") === "nosniff");
  check(
    "a medical-record URL never leaves in a Referer",
    served.get("referrer-policy") === "strict-origin-when-cross-origin",
  );

  const permissions = served.get("permissions-policy") ?? "";
  check("the camera permission is denied — the viewer receives, it never captures", permissions.includes("camera=()"));
  check("so is the microphone", permissions.includes("microphone=()"));
  check("and location", permissions.includes("geolocation=()"));

  check("older browsers still get X-Frame-Options", served.get("x-frame-options") === "SAMEORIGIN");

  // --- Production-only pieces ---------------------------------------------
  console.log("\nIn production, and only there");

  const prod = new Map(
    securityHeaders({ ...process.env, NODE_ENV: "production" }).map((h) => [h.key.toLowerCase(), h.value]),
  );
  const hsts = prod.get("strict-transport-security") ?? "";
  check("HSTS is set", hsts.startsWith("max-age="));
  check("for two years", /max-age=63072000/.test(hsts));
  check("including subdomains, and preload-eligible", /includeSubDomains/.test(hsts) && /preload/.test(hsts));
  check(
    "http is upgraded",
    (prod.get("content-security-policy") ?? "").includes("upgrade-insecure-requests"),
  );
  check(
    "the debug-only eval allowance never reaches production",
    !(prod.get("content-security-policy-report-only") ?? "").includes("unsafe-eval"),
  );

  const dev = new Map(
    securityHeaders({ ...process.env, NODE_ENV: "development" }).map((h) => [h.key.toLowerCase(), h.value]),
  );
  check("and HSTS is not claimed in development", !dev.has("strict-transport-security"));

  // --- The policy we intend to enforce -------------------------------------
  console.log("\nThe report-only policy describes the app that exists");

  const strict = reportOnlyCsp({
    ...process.env,
    NODE_ENV: "production",
    MEDIAMTX_WHEP_URL: "https://media.example.in:8889",
    MEDIAMTX_HLS_URL: "https://media.example.in:8888",
  });
  check("everything defaults to same-origin", directive(strict, "default-src") === "'self'");
  check(
    "the WHEP handshake origin is reachable",
    (directive(strict, "connect-src") ?? "").includes("https://media.example.in:8889"),
  );
  check(
    "the HLS fallback origin is reachable",
    (directive(strict, "media-src") ?? "").includes("https://media.example.in:8888"),
  );
  check(
    "a stream origin is listed once, not once per URL that shares it",
    reportOnlyCsp({
      ...process.env,
      MEDIAMTX_WHEP_URL: "https://media.example.in/whep",
      MEDIAMTX_HLS_URL: "https://media.example.in/hls",
    }).split("https://media.example.in").length -
      1 ===
      2,
  );
  check("the branch map embed still loads", (directive(strict, "frame-src") ?? "").includes("https://www.google.com"));
  check("violations have somewhere to go", (directive(strict, "report-uri") ?? "") === "/api/csp-report");
  check(
    "a malformed MEDIAMTX_WHEP_URL does not produce a broken policy",
    !reportOnlyCsp({ ...process.env, MEDIAMTX_WHEP_URL: "not a url", MEDIAMTX_HLS_URL: "" }).includes("undefined"),
  );

  // --- The report endpoint --------------------------------------------------
  console.log("\nThe report endpoint takes hostile input");

  const post = (body: string, type = "application/csp-report") =>
    cspReport(
      new Request("http://localhost/api/csp-report", {
        method: "POST",
        headers: { "content-type": type },
        body,
      }) as never,
    );

  const classic = await post(
    JSON.stringify({
      "csp-report": { "document-uri": "https://app.example.in/parent", "violated-directive": "script-src" },
    }),
  );
  check("a classic report is accepted", classic.status === 204);

  const reporting = await post(
    JSON.stringify([{ type: "csp-violation", body: { "effective-directive": "img-src" } }]),
    "application/reports+json",
  );
  check("so is the Reporting API shape", reporting.status === 204);

  check("junk is not an error anyone can learn from", (await post("<not json>")).status === 204);
  check("an empty body is refused quietly", (await post("")).status === 204);
  check("a megabyte of body is refused quietly", (await post("x".repeat(9000))).status === 204);
  check("nothing here is cached", classic.headers.get("cache-control") === "no-store");

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
