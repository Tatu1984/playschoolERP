# What you need to do

Written 2026-08-22, for the person taking this from "the engineering is done"
to "a school is using it".

Every step says what to do, how to know it worked, and what happens if you skip
it. Nothing here needs a developer; several steps need someone who is not one.

Ordered by what blocks what. **Sections 1–3 are before any real child's data
goes in.** Section 4 is the school itself. Section 5 is what to rehearse before
you rely on it.

---

## 1. Deploy what exists (about 30 minutes)

The code is on `main` and Vercel builds from it. What it does not have yet is
its secrets — and every integration is written to *refuse loudly* rather than
pretend, so an unconfigured deployment is safe, honest, and half-useless.

### 1.1 Set the environment variables

In **Vercel → Project → Settings → Environment Variables**, for **Production**
and **Preview** both. Generate every secret with `openssl rand -hex 32` and
never reuse one across two names.

| Variable | Value | Skip it and… |
|---|---|---|
| `DATABASE_URL` | Your Neon connection string (pooled) | Nothing works |
| `AUTH_SECRET` | `openssl rand -hex 32` | **The app refuses to boot in production** |
| `CCTV_TOKEN_SECRET` | A *different* `openssl rand -hex 32` | Same |
| `CCTV_INTERNAL_SECRET` | A *different* one again | Same |
| `APP_URL` | `https://your-domain.in` — no trailing slash | Password-reset links point at localhost |
| `CRON_SECRET` | `openssl rand -hex 32` | The nightly prune refuses everybody, and nothing is ever deleted |
| `RESEND_API_KEY` | From Resend (§2.1) | Password reset refuses: "please call the school office" |
| `EMAIL_FROM` | `Climb Kiddo <no-reply@your-domain.in>` | Same |
| `EXPO_ACCESS_TOKEN` | From Expo (§2.2) | **No emergency broadcast reaches a phone.** Every delivery is recorded as failed |
| `SENTRY_DSN` | From Sentry (§2.3) | Errors reach a log nobody reads |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token | Photo upload refuses |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` | From Razorpay (§2.4) | Fees are uncollectable online. Parents see "pay at the office" |
| `MEDIAMTX_WHEP_URL` / `MEDIAMTX_HLS_URL` | `https://media.your-domain.in` (§4.4) | The camera page cannot negotiate a stream |

> **The three secrets marked "refuses to boot" are deliberate.** A missing
> signing key does not fall back to a default in production — see
> `apps/web/src/config/env.ts`.

### 1.2 Deploy

Push to `main`, or hit **Redeploy**. The build now runs `prisma migrate deploy`
first, so pending migrations apply themselves.

**Sharp edge:** preview deployments build against the *same* `DATABASE_URL`, so
a preview of a branch containing a migration migrates production. Either give
previews their own Neon branch database or know that this is true.

### 1.3 Check it worked

```bash
curl -s https://your-domain.in/api/health | jq
```

Expect `{"status":"ok","database":"up","payments":"razorpay",…}`. If `payments`
says `disabled`, §2.4 is not done.

Then in **Vercel → Logs**, find the first line after the deploy:

```
Starting with 0 integration(s) switched off
```

If it says anything other than 0, the fields name which — `payments`, `mailer`,
`push`, `errors`. That line exists so you never have to guess.

### 1.4 Create the first administrator

There is no sign-up for staff, and `db:seed` inserts a fictional school you do
not want in production. From a machine with the production `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://…neon…" \
  npm run admin:create --workspace=@climbkiddo/web -- \
  --email head@theschool.in --name "Head Teacher"
```

It prints a generated password **once**. Sign in at `/login`, then change it.
Re-running the same command with `--password` resets an account — that is also
your way back in if the last admin is locked out before email works.

---

## 2. The four accounts it needs (about half a day)

Each is one interface with one driver behind it, so configuring one changes
nothing else. Do them in any order.

### 2.1 Resend — password reset and notification email

1. Create an account at resend.com.
2. Add your domain and publish the DNS records it gives you (SPF, DKIM). Mail
   from an unverified domain lands in spam, which for a password-reset link is
   the same as not sending it.
3. Create an API key → `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on that domain.
5. **Check:** go to `/forgot-password`, enter a real staff address, and follow
   the link. It expires in 30 minutes and works once.

### 2.2 Expo — push notifications

1. Create an Expo account, then an access token (Account → Access Tokens) →
   `EXPO_ACCESS_TOKEN`.
2. **Check:** send an INFO broadcast from `/admin/emergency` and look at the
   delivery numbers on it.

> **Worth knowing:** push tokens come from a mobile app, and there isn't one
> yet. Until there is, every recipient's push channel is recorded as "no
> registered device" and email does the work. That is honest and it is not
> delivery — for a lockdown you should still telephone.

### 2.3 Sentry — error tracking

1. Create a project (platform: Node). Copy the DSN → `SENTRY_DSN`.
2. **Check:** the boot line stops saying `errors: disabled`.
3. Create the alert rules listed in `docs/ops/alerting.md`. That file names the
   exact log strings to match, and the five conditions worth waking someone for.

### 2.4 Razorpay — fees

1. Complete KYC. Live keys → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
2. Add a webhook: `https://your-domain.in/api/webhooks/razorpay`, event
   `payment.captured` (and `payment.failed`). The signing secret it gives you →
   `RAZORPAY_WEBHOOK_SECRET`.
3. **All three or none.** Keys without the webhook secret switch payments off
   on purpose: the webhook is the only thing that may mark an invoice paid, and
   verifying it against a guessable constant would be worse than not taking
   payments.
4. **Check:** `/api/health` reports `"payments":"razorpay"`, then pay one real
   ₹1 invoice and confirm the receipt appears.

---

## 3. The things that are not engineering (start now — they run on other people's calendars)

### 3.1 Prove a backup restores — half a day, needs the Neon console

**A backup nobody has restored is a hypothesis.** Nobody has done this.

1. Neon → your project → confirm **point-in-time restore** is on, and note the
   retention window (days).
2. Restore to a *new branch* at a timestamp an hour ago.
3. Point a local checkout at it and run the suite against real restored data:
   ```bash
   DATABASE_URL="<restored branch url>" npm run test:integration --workspace=@climbkiddo/web
   ```
   254 assertions against a restore is a stronger check than opening a table.
4. Write down, in `docs/ops/`: how long it took (your RTO), how much data the
   restore point lost (your RPO), and who is called at 2am.

### 3.2 Give a lawyer the brief — blocking, and slow

Send them **`docs/ops/data-inventory.md`**. It is written for this purpose: every
category of data subject, every store, every third party, how access is
enforced, and eight gaps stated plainly.

What you need back:

1. **How long may a child's records be kept after they leave?** Nothing deletes
   them today. This is the largest single gap.
2. **What must be archived rather than deleted** (admission records, fee history
   — tax law probably sets a floor).
3. **A DPIA for the CCTV plane.** Live video of identifiable children is the
   highest-risk processing here.
4. **Verifiable parental consent** under the DPDP Act: is enrolment enough, and
   what must be recorded?
5. **A named data controller and a breach-notification procedure.**
6. **Whether photographs already published may stay** when consent is withdrawn.
   Today they do; the parent screen says so. That is a reading and they should
   confirm it.
7. **Third-country transfers**: Resend, Expo, and Sentry are outside India.
8. **A subject-access path**: what a parent may ask for and how you produce it.

Then set the retention periods they give you:
`CCTV_LOG_RETENTION_DAYS`, `DELIVERY_LOG_RETENTION_DAYS`,
`NOTIFICATION_RETENTION_DAYS` (see `docs/ops/retention.md` for the defaults and
why each is what it is).

### 3.3 Book a penetration test — blocking before cameras go live

Scope it to include **the CCTV plane**, not just the web app. Give the tester:

- A parent login, a teacher login and an admin login at a *staging* school.
- `docs/erp-cctv.md` (the two-plane design) and `docs/ops/data-inventory.md`.
- The specific question: *can one family reach another family's child?*

Everything in this repository is self-assessed. Before live video of children,
somebody else should try to break it.

---

## 4. Setting up the actual school (half a day, in the portal)

Sign in as the admin from §1.4. Everything below is a screen.

1. **Branches** (`/admin/branches`) — one row per campus. The `slug` is used by
   CCTV config; keep it short and stable.
2. **Classrooms** (`/admin/classrooms`, or under a branch) — name, capacity,
   programme.
3. **Staff** (`/admin/staff`) — give each one a password at creation and they
   get a login; leave it blank and it is an HR record with no access. Assign
   classrooms, or a teacher sees nothing.
4. **Students** (`/admin/students`) — child, then guardians. Each guardian with
   an email gets a parent login.
5. **Photo consent** — on each child's record, record what the family said.
   **Until somebody answers, that child is left out of every photographed post.**
   Parents can also set it themselves under Settings → Privacy.
6. **Fee structures** (`/admin/fees`) — per programme, then issue invoices.
7. **Settings** (`/admin/settings`) — school name, contact details, which
   features are on. On a fresh database these are placeholder defaults until you
   fill them in.

### 4.4 CCTV, which is separate infrastructure

The ERP never touches video. It answers one question — *may this person watch
this camera right now* — and MediaMTX enforces it.

1. Deploy MediaMTX on a host with **TLS** (`infra/docker-compose.yml` and
   `infra/mediamtx.yml` are the local versions; production needs certificates).
2. In `mediamtx.yml`, point `authHTTPAddress` at **your production app**:
   `https://your-domain.in/api/cctv/authorize`.
   > This is the trap that will cost you an afternoon: run the app anywhere
   > other than the address in this file and MediaMTX cannot authorise a read,
   > so the browser gets a 401 and it looks exactly like a broken camera.
3. Set `CCTV_AUTHORIZE_SECRET` in both places so only MediaMTX may call the hook.
4. Point cameras at it over RTSP. Register each one in `/admin/cameras` with its
   stream path, and map it to a classroom — that mapping is what decides which
   parents may watch.
5. Set school hours per branch. Outside them, access is denied and the denial is
   logged.
6. **Check:** a parent signs in, opens `/parent/cctv`, and sees a frame. Then
   check `/admin/audit` and the CCTV view log show it.

---

## 5. Before you rely on it

- [ ] **Rehearse a rollback.** Vercel → Deployments → an older one → Promote.
      Do it once on a quiet afternoon so nobody learns it during an incident.
      Note that a rollback does *not* undo a migration.
- [ ] **Rehearse a key rotation.** Changing `AUTH_SECRET` signs everybody out —
      correct, and worth knowing before you do it by surprise.
- [ ] **Create the alert rules** in `docs/ops/alerting.md`, and an uptime monitor
      against `/api/health` from *outside* Vercel.
- [ ] **Confirm the nightly prune ran** — Vercel → Logs, look for
      `Retention run complete` after 21:00 UTC.
- [ ] **Write the "I can't get in" support path.** It is the first thing that
      will happen, on the first morning.
- [ ] **Soft launch:** one branch, one term, with paper as a fallback.

---

## 6. What to tell staff and parents up front

Say these out loud rather than letting people discover them:

- **Photographs need consent.** A child with nothing on file is left out of
  photographed posts. Refusing later stops new posts; it does not unpublish old
  ones.
- **Emergency broadcasts ignore quiet hours.** A CRITICAL broadcast wakes a
  silenced phone by design, and the sender is asked to confirm.
- **Not everyone is reachable.** The broadcast screen shows how many people have
  a message in the portal only. Telephone them.
- **Totals on screen cover a window,** not all time. Every screen that shows one
  says so; the office system holds the full history.
- **The camera is watched, never recorded** by this app. Whatever the recorder
  keeps is set on the recorder.
- **SMS and WhatsApp do not work yet.** If a parent switches SMS on, the
  delivery record says there is no provider.

---

## 7. Known limitations, plainly

| Limitation | What it means today |
|---|---|
| No mobile app | Push has nowhere to arrive. Email carries notifications |
| No SMS or WhatsApp | Recorded as skipped, with the reason |
| No video upload | Photographs only; MP4 metadata is a different problem from EXIF |
| Marketing media library catalogues, it does not upload | Paste the public URL after adding the entry |
| Nothing deletes a child's records | Waiting on §3.2 |
| No self-service data export | Requests go to the office |
| Messages and the feed are fetched whole | Fine at a term's volume; `npm run load:measure` is how to judge it later |
