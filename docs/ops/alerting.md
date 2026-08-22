# What to alert on, and what to do about it

Written 2026-08-22, alongside wiring `setErrorReporter` to a tracker.

Everything below is a *log line this codebase actually emits*, or a check
something outside it can run. Nothing here is aspirational: each condition names
the string an alert rule matches, and the file that produces it. If a line ever
changes, this page is wrong and the alert is silently dead — so change them
together.

Alerts are configured wherever the logs land (Vercel log drains, Sentry, or a
Better Stack-style tail). This repository cannot create them; it can only make
sure there is something unambiguous to match.

---

## Boot: an integration is switched off

**Match:** `Starting with N integration(s) switched off`
**From:** `src/instrumentation.ts` → `describeIntegrations`
**Severity:** page whoever deployed, immediately.

Every integration in this codebase refuses rather than pretends when it is
unconfigured. That is the right behaviour and it is also silent, so this line
exists to make it loud. The fields say which:

- `payments: "disabled"` — fees are uncollectable online. Nobody finds out until
  a parent complains that the pay button does nothing.
- `mailer: "disabled"` — password reset refuses. A locked-out parent has only
  the office telephone.
- `push: "disabled"` — **no emergency broadcast reaches a phone.** Every
  delivery is recorded as failed, which is honest and is not a substitute for
  the notification arriving.
- `errors: "disabled"` — nothing below this line will ever reach a tracker.

## A payment webhook signature did not verify

**Match:** `Payment webhook signature did not verify`
**From:** `src/app/api/webhooks/razorpay/route.ts`
**Severity:** investigate the same day; a burst is an incident.

Nobody sends an unsigned `payment.captured` by accident. What is being attempted
is marking invoices paid that nobody paid. One of these after a key rotation is
explicable; a run of them is somebody trying. The report carries the caller's
address and user agent.

## Live video was denied

**Match:** `CCTV view denied`
**From:** `src/backend/services/cctv.service.ts`
**Severity:** alert on a *rate*, not on the event.

One parent trying to watch outside school hours is ordinary and happens daily.
Fifty denials in a minute, or many camera ids from one account, is somebody
walking ids. Suggested threshold to start with: more than 20 in five minutes
from one `userId`. Tune it from the first month of real traffic rather than from
this sentence.

Every denial is also in `CctvViewLog` with its reason, which is the record to
read during an investigation. This line is for waking someone up.

## Unhandled errors

**Match:** `Unhandled error in route handler`, `Unhandled error while serving a request`
**From:** `src/backend/utils/error-handler.util.ts`, `src/instrumentation.ts`
**Severity:** alert on rate; investigate anything sustained.

The first is a route that threw something that was not an `AppError` — always a
bug. The second is Next.js catching an error nothing in this codebase caught,
which is usually worse. Both reach the tracker when one is configured. The
reported path is the *route pattern*, never the URL: a real path can carry a
password reset token or a child's id.

## A broadcast reached fewer people than it was for

**Match:** `Safety broadcast delivered` with `unreached` greater than zero
**From:** `src/backend/services/notification.service.ts`
**Severity:** for a CRITICAL broadcast, this is an immediate phone-call list.

The per-recipient reasons are in `NotificationDelivery` for that `broadcastId`.
"Unreached" means the message is in their portal and nowhere else — they have
not seen it unless they happen to open the app.

## The health check

**Match:** `GET /api/health` returning anything but 200, from an external monitor
**From:** `src/app/api/health/route.ts`
**Severity:** page.

It asks the database a real question, so a 503 means requests are failing, not
that a process is missing. It also reports which payment driver booted — the
same fact as the boot line above, available to anything that can make an HTTP
request. Set an uptime monitor against it from outside Vercel; a monitor inside
the thing it is monitoring is not a monitor.

---

## Not covered yet

- **No alert on rate-limit saturation.** A spike in 429s from `login-ip` is a
  credential-stuffing run in progress, and nothing watches for it.
- **No synthetic check of the whole sign-in path.** The health check proves the
  database answers, not that a parent can get in.
- **Nothing watches delivery lag.** `after()` runs the fan-out inside the same
  invocation; if it were killed mid-way, `deliveryFinishedAt` stays null and no
  alert notices.
