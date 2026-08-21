# Plan of Action — Climb Kiddo ERP + CCTV

**From where this is today to something that can hold a real school's data.**

Last updated: 2026-08-21 (Phase 1 complete). Every claim below was checked
against the codebase on that date; file paths are given so each one can be
re-verified rather than taken on trust.

---

## 1. Where this actually stands

**Overall: ~70% ready.** (Phase 1 is done — §2 records what was closed.) Deployable to a pilot — one branch, staff who know
they are early, no marketing push. Not ready for a full school's records, and
not ready for parents who will depend on it.

The architecture is genuinely good and is not the problem. Routes stay thin,
rules live in services, `Scope` resolves "who may see what" in one place, and
the mappers keep the database shape out of the API. Nothing below asks for that
to be rebuilt.

What is missing splits three ways: **hardening that is nearly done**, **features
that were designed and never built**, and **operational ground that has not been
broken at all**.

### Scorecard

| Area | State | Why |
|---|---|---|
| Access control & scoping | 95% | Per-role, tested (32 assertions). Audit trail now scoped too. |
| Payments | 90% | Mock unreachable in prod, webhooks verified, replays idempotent. |
| Auth & sessions | 70% | Revocable, rate limited. **No account recovery at all.** |
| Data integrity & migrations | 95% | Migrations clean, drift-checked in CI. |
| Dependencies | 95% | Zero high-severity in runtime deps; CI fails on a new one. |
| Transport & headers | 75% | Enforced frame-ancestors/HSTS/nosniff. Full CSP still report-only. |
| Backend testing | 80% | 111 integration assertions against real Postgres. |
| Frontend/E2E testing | 15% | Two reducer suites. No browser test exists. |
| Observability | 70% | Structured logs, health check. No tracker wired, no alerting. |
| Scale | 60% | Bootstrap bounded to a term. Client-store architecture unchanged. |
| Core feature completeness | 55% | **No photo upload, no notification delivery.** |
| Compliance & DR | 20% | No retention policy, no backup drill, no DPIA. |
| Mobile app | 0% | Referenced in scripts and docs; does not exist. |

### What is already closed

Verified by tests that fail against the previous code, not by inspection:

- Payments could be settled without paying (mock driver was the production
  fallback); webhooks were forgeable against a secret published in the repo.
- Any staff member could read any child's medical records, invoices and messages
  across branches, by id.
- Sessions could not be revoked — a disabled account worked for seven more days,
  and a demoted admin kept admin rights.
- Login and the public forms had no brute-force protection.
- `schema.prisma` had drifted from `migrations/`; a deploy would have broken.
- No CI. Now green, including the integration suite against real Postgres.
- A middleware/proxy bypass in `next@16.2.6` (GHSA-6gpp-xcg3-4w24) sat under
  the role gates on `/admin`, `/teacher` and `/parent`.
- Thirteen high-severity advisories in production dependencies.
- No security headers at all: any site could frame the live camera feed.
- The audit trail answered every admin with every branch's entries.

240 assertions total: 129 unit, 111 integration.

---

## 2. Phase 1 — Hardening — **done, 2026-08-21**

Four items, all merged. Each is recorded here rather than deleted, because the
next person's first question about a security control is what it was for.

### 1.1 Next.js 16.2.6 → 16.3.2 ✅

Closed nine advisories, [GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24)
among them: *middleware/proxy bypass in App Router apps using Turbopack*, which
is exactly what `apps/web/src/proxy.ts` is and how it runs. The blast radius was
limited on purpose — the API layer never trusted the proxy, so every route
re-derives scope in the service layer, and a bypass exposed page shells rather
than data.

16.3 also enables `no-location-assign-relative-destination`, which caught a real
one: "Pay this invoice" navigated with `window.location.href`, reloading the
whole portal to move one route across. Now `router.push`.

### 1.2 Dependency advisories ✅

Zero high-severity in runtime dependencies, without a single forced downgrade:

- `@vercel/blob` 2.4 → 2.8 and `prisma`/`@prisma/*` 7.8 → 7.9 carried the
  `undici` and `fast-uri` fixes.
- `shadcn` is a scaffolding CLI plus a stylesheet, so it is a devDependency now.
  That took `ip-address`, `js-yaml`, `brace-expansion` and most of the `hono`
  tree out of the production surface — none of it was ever reachable from a
  request.
- `deepmerge-ts` is pinned to exactly 7.1.5 by `@prisma/config`, which reaches
  production because `@prisma/client` depends on the CLI. An `overrides` entry
  moves it to ^8; `@prisma/config` uses only the plain `deepmerge` export.

CI now runs `npm audit --omit=dev --audit-level=high`, so a new advisory fails
the build rather than waiting for someone to look.

### 1.3 Security headers ✅

`apps/web/src/config/security-headers.ts`, spread into `headers()` in
`next.config.ts` for every path. Kept in its own module so it can be tested —
a header set that lives only in configuration is one that vanishes in an
unrelated edit.

**Enforced now:** `frame-ancestors 'self'` (the sharp edge — nothing stopped
another site framing the live camera view), `object-src 'none'`, `base-uri`,
`form-action`, `upgrade-insecure-requests` in production, `nosniff`,
`strict-origin-when-cross-origin`, HSTS for two years with `preload`, and a
`Permissions-Policy` denying camera and microphone: the CCTV viewer receives
video, it never captures any.

**Report-only:** the full `default-src 'self'` policy, reporting to
`/api/csp-report`. Enforcing it blind across 100+ routes breaks a page nobody
remembered, in a parent's browser rather than in CI.

Two decisions worth keeping:

- `'unsafe-inline'` for scripts is deliberate. A nonce means every static
  marketing page becomes a server render, because Next.js can only apply one to
  a dynamically rendered page. The policy still stops an injected script from
  loading code from — or sending records to — an unlisted origin.
- `MEDIAMTX_WHEP_URL` / `MEDIAMTX_HLS_URL` are read into `connect-src` at build
  time. Changing either needs a redeploy for the policy to follow it.

**Still open:** promote the report-only policy to enforced once the reports are
quiet, and add `https://checkout.razorpay.com` when Checkout lands in the
browser.

### 1.4 Audit trail scoping ✅

`AuditEntry` now carries the actor's branch, written from the session at record
time, and `auditService.list()` takes a `Scope`. SUPER_ADMIN sees everything; an
ADMIN sees their own branch. A null branch means "no single branch" — a
SUPER_ADMIN acting globally, or a row from before the column existed — and only
SUPER_ADMIN reads those. An admin whose own branch is unset gets nothing, rather
than exactly that reserved set.

This was the last finding from the original audit still open.

---

## 3. Phase 2 — Paths that were designed and never built (est. 2–3 weeks)

This is the bulk of the remaining distance, and none of it is hardening — it is
product surface that looks finished and is not.

### 2.1 Account recovery — **nothing works today**

`ForgotPasswordForm.tsx` and `OtpForm.tsx` await a `setTimeout` and show a
success toast. There is no `/api/auth/forgot-password`, no reset endpoint, and
no OTP verification. `apps/web/src/app/api/auth/` contains only `login`,
`logout`, `me`, `register`.

A parent who forgets their password has no way back into the account holding
their child's records, and the UI tells them a reset email is on its way.

Needs:

- An email provider (Resend or SES) behind an interface, the way
  `backend/integrations/payments.ts` wraps the gateway — one file that decides,
  never branched on elsewhere.
- Single-use, expiring, hashed reset tokens in their own table. Rate limited via
  the existing `enforceRateLimit` (a bucket already exists for this shape).
- The reset must call `revokeSessions(userId)` — a password change that leaves
  old sessions alive is not a password change.
- SMS (Twilio or MSG91) if phone OTP is genuinely wanted; drop the OTP screen if
  not. Shipping a verification step that verifies nothing is worse than not
  having one.

**Exit:** an integration test that walks request → token → reset → old sessions
refused → new password works.

### 2.2 Notification delivery — records with no delivery

`AppNotification`, `DeviceToken`, `NotificationPreference` and `SafetyBroadcast`
all persist correctly. Nothing sends. There is no FCM, APNs, email or SMS
integration anywhere in the codebase.

The sharpest case is `/api/emergency/broadcasts`: an emergency broadcast writes
a row and reaches nobody. For a school safety feature, a UI that says "sent" and
means "saved" is the kind of thing that matters exactly once.

Needs: a push provider behind an interface, delivery attempted on write,
per-channel respect for `NotificationPreference`, delivery status recorded on
the row, and dead device tokens pruned on rejection.

**Exit:** an integration test asserting a broadcast enqueues per recipient and
records failures; a manual end-to-end to a real device.

### 2.3 Photo and video storage — the feature parents pay for

Only the legacy marketing gallery accepts a file (`lib/gms/gallery.ts`, and its
validation is sound: size cap, MIME allowlist, sanitised filename). The ERP has
no binary upload path at all — `mediaAssets`, activity photos and artwork are
URL metadata pointing at nothing.

The daily photo feed is the headline feature of a playschool ERP, and it does
not exist.

Needs:

- Upload through Vercel Blob, reusing the GMS validation.
- **Private access, not `access: "public"`.** The GMS gallery is public because
  it is marketing. Photographs of children must not be reachable by URL alone —
  serve them through a short-lived signed URL, the way the CCTV view token
  already works. That pattern is in the codebase; follow it.
- EXIF stripping on upload — location metadata in a nursery photo is a
  disclosure of where a child is.
- Consent per child: a parent must be able to refuse photography, and a refusal
  must exclude that child from feed posts, not merely hide the post.

**Exit:** upload/serve integration tests, including that an unsigned URL is
refused and that a child without consent never appears.

### 2.4 Decide the mobile app

The root `package.json` has a `mobile` script pointing at `@climbkiddo/mobile`,
and `bootstrap.service.ts` documents that the mobile app deliberately fetches
per screen. The workspace does not exist.

Either build it or remove the references. A script that cannot run and a
docstring describing absent software both mislead the next person.

---

## 4. Phase 3 — Operations and compliance (est. 1 week, plus legal review)

Nothing here has been started, and this is a product holding children's medical
records and live video of them.

### 3.1 Backups and recovery

Neon offers point-in-time restore — confirm it is enabled, and confirm the
retention window. Then **actually restore into a scratch database and run the
integration suite against it.** A backup nobody has restored is a hypothesis.

Write the runbook: how to restore, expected RTO/RPO, who is called.

### 3.2 Data retention

No policy exists, and CCTV footage has none by default.

- How long is footage kept? (Typically 30 days for a nursery; take advice.)
- Automatic deletion when a child leaves, and a defensible archive for what must
  be kept.
- `CctvViewLog` grows without bound; it is also the record proving who watched
  what, so it needs a deliberate retention period rather than an accidental one.
- `RateLimit` rows: `pruneRateLimits()` exists and nothing calls it. Schedule it.

### 3.3 Privacy and legal

For children's biometric-adjacent data and CCTV, in India this touches the DPDP
Act 2023 and its provisions on children's data and verifiable parental consent.
This needs a lawyer, not a developer, and it needs one before launch, not after.

- Data Protection Impact Assessment for the CCTV plane.
- Parental consent capture, versioned, per child, revocable.
- A subject access path: what a parent may request, and how it is produced.
- Named data controller, and a breach-notification procedure.

### 3.4 Error tracking and alerting

`setErrorReporter` in `backend/utils/logger.util.ts` is a seam with nothing
plugged into it. Point it at Sentry from `instrumentation.ts` and every
`logger.error` starts reporting with no other change.

Alert on: `/api/health` non-200, payment webhook signature failures (someone is
trying), `payments: "disabled"` in production (fees silently uncollectable),
CCTV `AUTHORIZE_DENIED` spikes, and 5xx rate.

### 3.5 Secrets

Confirm every required variable is set in Vercel for production and preview:
`AUTH_SECRET`, `CCTV_TOKEN_SECRET`, `CCTV_INTERNAL_SECRET`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `DATABASE_URL`.

`config/env.ts` throws in production for the first three, and payments switch
themselves off rather than mocking — so a missing secret fails loudly. Verify it
in a preview deploy rather than trusting the code review.

Plan a key-rotation procedure. Rotating `AUTH_SECRET` signs every session out,
which is correct and should be a known, rehearsed consequence.

---

## 5. Phase 4 — Scale and honesty in the UI (est. 1–2 weeks)

### 4.1 Surface `coverage`

The bootstrap now returns how far back it reached
(`SnapshotCoverage` on the store's meta state). No screen says so. Anything
showing a total — "absent 4 times", "₹12,000 collected" — is showing it *within
a 120-day window* and presenting it as all-time.

Either label the windowed views or fetch the full range for the few screens that
genuinely need it. This is a correctness problem wearing a UI costume.

### 4.2 Per-screen fetching

45 components read the single client store. That was the right call while the
backend was being built, and it is the ceiling now: every portal load pulls a
term of everything whether the screen needs it or not.

Migrate the heaviest screens (attendance, feed, messages) to the per-resource
endpoints — which already exist, already take filters, and are already scoped.
Keep the store for genuinely global reference data. This is incremental; it does
not need a rewrite.

### 4.3 Load testing

No performance work has been done against realistic volume. Seed a database with
400 students, a year of attendance, and two years of messages, then measure
bootstrap, the admin dashboard, and the analytics snapshot. Set the windows and
caps from measurements rather than from the guesses currently in
`bootstrap.service.ts`.

### 4.4 Frontend and end-to-end testing

Backend coverage is now reasonable; the frontend has two reducer suites and no
browser test. Add Playwright over the paths that must never break: sign in as
each role, a parent watching a camera, an admission through the public form, and
paying an invoice.

---

## 6. Phase 5 — Pre-launch (est. 1 week)

- **Independent penetration test**, scoped to include the CCTV plane. Everything
  above is self-assessed; before live video of children, someone else should try
  to break it.
- **Accessibility audit** — WCAG 2.2 AA. Parents include disabled parents.
- **Staff and parent onboarding material**, and a support path for "I cannot get
  in", which is the first thing that will happen.
- **A rehearsed rollback** for a bad deploy.
- **Soft launch**: one branch, one term, with the ability to fall back to paper.

---

## 7. Suggested order

| Order | Work | Effort | Blocks launch? |
|---|---|---|---|
| ~~1~~ | ~~Next upgrade + dependency advisories~~ | done | ✅ |
| ~~2~~ | ~~Security headers~~ | done | ✅ (CSP still report-only) |
| ~~3~~ | ~~Audit trail scoping~~ | done | ✅ |
| 4 | Account recovery + email provider | 4–5 d | Yes |
| 5 | Notification delivery | 4–5 d | Yes — emergency broadcasts |
| 6 | Backups, restore drill, retention | 3 d | Yes |
| 7 | Privacy/DPIA/consent | legal-led | Yes |
| 8 | Error tracking + alerting | 1 d | Yes |
| 9 | Photo storage with signed URLs | 5–7 d | Feature-dependent |
| 10 | Surface `coverage` | 2 d | No, but it is currently misleading |
| 11 | Load testing, then tune windows | 3 d | No |
| 12 | Playwright E2E | 4 d | No |
| 13 | Per-screen fetching | 5–10 d | No |
| 14 | Penetration test | external | Yes, before CCTV goes live |
| 15 | Accessibility audit | 3 d | No |
| 16 | Mobile app — build or delete references | — | No |

Roughly **4–6 weeks of engineering** from the original starting point, of
which Phase 1 is now spent, to a defensible launch for one school,
excluding legal review and the external pen test, both of which should start
early because they run on someone else's calendar.

---

## 8. Things worth not forgetting

- **`@default(now())` is a trap in this schema.** Prisma maps `DateTime` to
  `timestamp without time zone`, so a database-side default records the
  server's *local* wall clock and Prisma reads it back as UTC. On a machine set
  to `Asia/Kolkata` that lands 5½ hours in the future. It already broke a
  security comparison once. Every `createdAt` carries the same latent skew,
  harmless only because nothing compares them to the clock. For any column that
  will be, write it from the application.
- **`RefreshToken` is modelled and unused.** Revocation was solved directly.
  Either build rotation or drop the table; a half-present concept invites
  someone to assume it works.
- **The proxy is not a security boundary.** Every API route re-derives scope in
  the service layer, and that is why the Next advisory is survivable. Keep it
  that way: never move an authorisation decision into `proxy.ts`.
- **Tests must fail against the bug.** Each suite added was run against the
  previous code to confirm it caught the defect. A regression test that has
  never gone red is decoration.
