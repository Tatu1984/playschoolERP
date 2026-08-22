# Climb Kiddo — Project Update

**Last updated:** 2026-07-27
**Repo:** [Tatu1984/playschoolERP](https://github.com/Tatu1984/playschoolERP) — the only repo for this project
**Branches:** `main` (Vercel deploys from it)
**Database:** Neon Postgres (`ep-autumn-sound-ayzx522r`), schema pushed + seeded 2026-07-27
**Working dir:** `/Users/sudipto/Desktop/projects/playschool` · **Backup snapshot:** `/Users/sudipto/Desktop/projects/climbkiddo`

---

## ▶ RESUME HERE — after a system restart

Everything is committed and pushed to `main` on
[playschoolERP](https://github.com/Tatu1984/playschoolERP). After a reboot,
**Postgres auto-restarts** (Homebrew launchd) but **Colima + the CCTV containers do NOT** — bring them back with:

```bash
cd /Users/sudipto/Desktop/projects/playschool

# 1. Database (usually already running after login; safe to re-run)
brew services start postgresql@14
#    one-time only (already done): role+db created to match DATABASE_URL

# 2. CCTV media server (Colima VM + MediaMTX + ffmpeg test stream)
colima start                                   # boots the Docker VM (~10-20s)
docker compose -f infra/docker-compose.yml up -d mediamtx teststream
#    NOTE: we do NOT start the compose 'postgres' service — brew Postgres owns :5432

# 3. App
npm run dev                                    # http://localhost:3000
```

**Verify the stack is healthy:**
```bash
curl -s http://localhost:9997/v3/paths/list | grep -o '"ready":true'   # -> classroom-a is live
```

**Demo logins** (password `password12345`):

| Role | Email | Lands on | Also reachable |
|---|---|---|---|
| Admin | `admin@climbkiddo.in` | `/admin` | `/teacher` (preview), `/kids` |
| Teacher | `meera@climbkiddo.in` | `/teacher` | `/kids` |
| Parent | `parent@example.com` | `/parent` | `/parent/cctv`, `/kids` |

If demo data is ever wiped: `npm run db:push && npm run db:seed`.

**Two data planes right now** — worth knowing before you demo anything:

- **Postgres (real):** auth/session, RBAC, branches, classrooms, students, guardianship, and the whole CCTV module (cameras, tokens, school hours, view log).
- **In-browser demo store (`src/frontend/store/erpStore.ts`):** every other ERP module. Seeded from `src/shared/fixtures/**`, persisted to `localStorage`, and mutated by the UI for real — enrol a student, collect a fee, publish a notice, RSVP, earn a star, and it sticks across navigation and reload. Reset it from **Admin → Settings → Demo data** or **Parent → Settings → Privacy**.

That store is the single seam the backend phase replaces; see *Backend phase — the plan* below.

### Current running state (as of this session)
- ✅ Homebrew **Postgres 14** running; `playschool` DB with schema + seed data.
- ✅ **Colima** Docker runtime installed & running; **MediaMTX** + **ffmpeg test stream** containers up (`ck_mediamtx`, `ck_teststream`), `restart: unless-stopped` so they revive once Colima is up.
- ✅ **CCTV pipeline verified server-side end-to-end:** test stream publishes (H.264 720p+AAC), our `/api/cctv/authorize` hook authorizes **publish** (200) and correctly **denies reads without a token (401) / allows reads with a valid 60s token (200)** — confirmed in the dev log.
- ⚠️ **Not yet eyeballed in a browser:** the final WHEP video frame at `/parent/cctv`. Auth + publish + read-authorization all proven; the last mile is opening the page in a browser. If WebRTC/ICE misbehaves through the Colima VM, the ICE-TCP candidate (already configured) or an HLS fallback in the player is the fix.

---

## 📷 How to connect REAL CCTV cameras (school NVR / IP cameras)

The system is camera-source-agnostic. For each physical camera:

1. **Get its RTSP URL** from the NVR/camera (e.g. Hikvision:
   `rtsp://user:pass@<nvr-ip>:554/Streaming/Channels/101`, Dahua:
   `rtsp://user:pass@<ip>:554/cam/realmonitor?channel=1&subtype=0`).
2. **Point MediaMTX at it** — add a path in `infra/mediamtx.yml` whose name equals the
   camera's `streamPath`, with the RTSP as its source (pulled on demand):
   ```yaml
   paths:
     classroom-a:
       source: rtsp://user:pass@<nvr-ip>:554/Streaming/Channels/101
       sourceOnDemand: yes
     all_others:            # keep for the test stream / publish-based feeds
   ```
   Then `docker compose -f infra/docker-compose.yml restart mediamtx`.
   (Or add paths live via the MediaMTX API — no restart.)
3. **Register it in the admin UI** → `/admin/cameras` → *Add camera*: set name, branch,
   classroom (this is what scopes parent access), the **same `streamPath`**, and the RTSP URL
   (stored server-side only, never sent to browsers). Toggle *Visible to parents*.
4. **Map students to that classroom** (currently via seed / DB; Students admin UI is Phase 3)
   so their parents inherit access.
5. **Set school hours** per branch (`SchoolHours` rows; seed sets 06:00–22:00 daily) — live
   viewing is only allowed inside that window.

**Where MediaMTX runs in production:** on a small box on the school LAN (with network reach to
the cameras/NVR) or a VPS the cameras can reach. Put it behind TLS and point
`MEDIAMTX_WHEP_URL` / `MEDIAMTX_HLS_URL` at it. Set real secrets: `AUTH_SECRET`,
`CCTV_TOKEN_SECRET`, `CCTV_INTERNAL_SECRET`, and `CCTV_AUTHORIZE_SECRET` (locks the authorize
hook to MediaMTX only). Cameras never expose RTSP to the internet — only MediaMTX does WHEP/HLS.

Full architecture: [`docs/erp-cctv.md`](docs/erp-cctv.md).

---

## 🧱 Backend phase — the plan

Every screen already talks to a typed action; nothing in the UI knows where data
comes from. Converting a module is therefore mechanical:

1. **Schema** — extend `src/backend/database/prisma/schema.prisma` with the models
   already typed in `src/shared/types/**` (they were written to map 1:1).
2. **Repository** — `src/backend/repositories/<domain>.repository.ts` (Prisma only).
3. **Service** — `src/backend/services/<domain>.service.ts`: business rules + RBAC
   via `requirePermission`, mirroring the rules currently living in store actions
   (e.g. `payInvoice` capping at the invoice total, notice audience filtering).
4. **Validator** — `src/backend/validators/<domain>.validator.ts` (Zod).
5. **Route adapter** — `src/app/api/<resource>/route.ts`, thin, delegating to the service.
6. **Swap the seam** — replace the matching action in `erpStore.ts` with a `fetch`
   (or move that domain to a TanStack Query hook in `src/frontend/api/endpoints/`).
   **No component changes**: pages only ever call actions and the pure selectors in
   `src/frontend/store/queries.ts`.
7. **Seed** — `src/backend/database/seed.ts` can import the same
   `src/shared/fixtures/**` the UI uses, so the demo school survives the move.

Recommended order (each is independently demoable): Students/Staff → Attendance →
Activity feed → Notices → Fees (Razorpay + webhook) → Messaging → Progress reports →
Admissions → Events → CMS → Analytics → Kids-zone progress.

`npm run check:flows` exercises the business rules those services must reproduce —
59 assertions covering enrolment, attendance, publishing, payments, messaging,
admissions, RSVP, kids-zone rewards, settings and reset.

---

## 🔜 Future work / next steps (in priority order)

1. **Walk the UI in a real browser.** All 82 routes were swept against a production
   build as every role, and the 59 store-flow + 8 overlay assertions pass — but nobody
   has clicked through the drag-and-drop kanban, canvas games or audio pads on a real
   device. Phones especially: the parent tab bar and kids-zone touch targets.
   (The overlay suite exists because exactly this gap shipped a crash once.)
2. **Convert modules to the real backend**, in the order under *Backend phase* above.
   Students + Staff first: they unlock real parent↔camera mapping without seeding.
3. **Confirm CCTV video in the browser** at `/parent/cctv`; if WebRTC struggles through Colima,
   add an **HLS fallback** to `LiveCameraPlayer` (hls.js) — most robust cross-browser path.
4. **CCTV admin polish:** per-parent access grants/revocations UI (`CameraAccessGrant` exists in
   schema, no UI yet); edit/delete camera; school-hours editor per branch.
5. **Proper migrations:** switch from `prisma db push` to `prisma migrate dev` before any real data.
6. **Real media pipeline** for the activity feed and gallery (R2/Blob + Sharp thumbnails).
   The composer already attaches files and models them as `MediaRef`; only the upload is faked.
7. **Ops:** `git` commit on a feature branch; CI (typecheck + lint + `check:flows`);
   Neon DB for staging/prod; deploy MediaMTX; sitemap.xml + robots.txt; Lighthouse pass.
8. **Mobile app** (Expo) — the parent portal's information architecture and the `PARENT_TABS`
   config were built to be ported screen-for-screen.

### Known deviations from SOW (intentional, documented)
- **Auth:** custom JWT (jose) + bcrypt in an HttpOnly cookie, not NextAuth (robust on Next 16).
- **Route handlers:** physically in `src/app/api/**` as thin adapters delegating to
  `src/backend/services` (Next.js only serves handlers under `app/`); rest of the mandated tree honored.
- **Local infra:** Homebrew Postgres (not the compose Postgres) since Docker wasn't preinstalled.
- **Data layer for non-CCTV modules:** the persisted client store described above, until each
  module gets its service. TanStack Query + Axios are *not* installed yet — they land with the
  first converted endpoint, behind `src/frontend/api/`.
- **Charts:** hand-rolled SVG in `src/frontend/components/ui/Charts.tsx` instead of a chart
  library — bar/line/donut/radial/skill-bars is all §7.16 needs, and it keeps the bundle small.
- **Kids-zone audio:** Web Audio oscillators + `speechSynthesis` for narration rather than
  recorded assets, so there is nothing to license or ship until real voice work is commissioned.
- **Portal pages are client-rendered** behind `StoreGate` (skeleton → content). The demo store
  lives in `localStorage` and its fixtures use relative dates, so a server pre-render would
  always disagree with the client. Marketing pages stay server-rendered for SEO.

---

## ✅ Done

### UI/UX completion pass — the last gaps closed (2026-07-28)

**99 static pages build green.** All 82 routes swept against a production build
(`next start`) as admin, teacher, parent and anonymous — every one 200, 404 only
where intended.

- **`/programs/[slug]`** — the one SoW route with no page. Each of the seven
  programs now has a full page: outcomes, a typical week, milestones, a
  term-by-term curriculum timeline, fee breakdown, classrooms, the teachers who
  run it, and cross-links to the rest. The `/programs` index gained a card grid
  linking into them.
- **CMS edits now reach the public site.** `/blog`, `/blog/[slug]`, `/events`,
  `/events/[slug]` and `/testimonials` render server-side from fixtures (so
  crawlers and first paint get real HTML) and swap to the CMS store on hydration
  via `useLiveContent`. Editing a post in `/admin/cms/blog` changes `/blog`.
  Post/event detail pages no longer `notFound()` on the server, so a *newly
  created* CMS entry resolves client-side instead of 404ing.
- **`/parent/payments/invoices`** is a real page instead of a redirect: the full
  billing paper trail with filters, per-child filter, receipt list, invoice
  dialog and CSV export.
- **Loading, error and not-found boundaries** for every surface. Portal skeletons
  match the KPI+rows layout; the site gets a hero skeleton; the kids zone gets
  kid-appropriate copy ("Oops! That didn't work") with no stack traces, because a
  child may be looking at it alone. Staff error pages *do* show the message and
  digest, since hiding it helps nobody.
- **SEO**: `app/sitemap.ts` (40 URLs incl. every program, post and event) and
  `app/robots.ts` (disallows `/admin`, `/teacher`, `/parent`, `/kids`, `/gms`,
  `/api` and the auth routes — children's data must never be indexed).
  Open Graph + Twitter metadata and a theme colour on the root layout.
- **Contact**: both campuses embedded via Google's keyless maps endpoint (no API
  key to leak, lazy-loaded), each with directions and a call button.
- **Social links** now come from `ACTIVE_SOCIALS` in `shared/constants/site.ts`
  and render only when configured — no more dead `href="#"`.
- **Accessibility**: a skip-to-content link (first tab stop) wired to `#main` on
  every shell, and a global `prefers-reduced-motion` block that neutralises the
  animation kit, kids-zone bobbing and marquees.
- **`tsconfig` now excludes `** 2.*`** — the file-sync duplicates had started
  landing in `.next/types` and the generated Prisma client and were breaking
  `tsc` through no fault of the source.

### Full UI/UX build-out — every SoW surface, end to end (2026-07-27)

**90 routes build green.** TypeScript, ESLint and `next build` all clean; every route swept
per role (admin / teacher / parent / anonymous) with the expected 200 / 307; 59 store-flow
assertions pass via `npm run check:flows`.

**Foundation**
- `src/shared/types/**` — every SoW §11 entity typed (school, engagement, learning, ops),
  ISO-string dates so records survive JSON both to `localStorage` today and over HTTP later.
- `src/shared/fixtures/**` — a whole demo school: 2 branches, 6 classrooms, 10 staff,
  24 students + guardians, 21 school days of attendance, feed, notices, threads, invoices,
  events, 12 enquiries, 6 applications, reports, milestones, CMS, blog, analytics.
  Deterministic (seeded PRNG, no `Math.random` at module scope) and importable by `seed.ts`.
- `src/frontend/store/erpStore.ts` — persisted Zustand store: generic CRUD plus ~30 domain
  actions carrying the real rules (payment capping, unread counters, badge thresholds,
  audience filtering). `queries.ts` holds pure selectors so components never re-derive.
- `src/frontend/components/ui/**` — the kit that made 50 pages tractable: `DataTable`
  (search / filter / sort / paginate / bulk-select / ⋯ row menus / CSV export), `FormDialog`,
  `ConfirmDialog`, `DetailDialog`, field set, `KpiCard`, `StatusBadge`, `Charts` (SVG),
  `Timeline`, `Stepper`, `EmptyState`.
- `PortalShell` — one shell for all three portals: sidebar + mobile drawer + topbar with a
  live notification bell and account menu, branch/class/child switchers, parent tab bar.

**Admin (SoW §8.6) — 16 pages**
Overview (real CCTV stats + store KPIs, DB-outage tolerant) · Students · Staff · Branches &
classrooms · Admissions (drag-and-drop kanban + applications + visits) · Fees (invoices,
collections, structures, trend) · Notices · Events · CMS pages & banners · Blog · Media
library (drag-drop upload) · Analytics (5 tabs) · Roles & permission matrix · Settings
(feature flags, seasonal theme, demo reset) · Audit log (admin + CCTV tabs) · Cameras.

**Teacher (§8.5) — 8 pages**
Dashboard with tap-to-check-in · Classes · Class detail · Attendance marker (bulk, day log
with mood/meals/nap, pickup codes) · Activity composer (media, student tagging, drafts,
internal notes) · Lesson planner (week grid + curriculum reference) · Messages (+ meetings) ·
Progress reports (skill sliders, publish, milestones).

**Parent (§8.3) — 13 pages**
Dashboard · Daily feed (hearts, comments, lightbox) · Attendance (4-week grid, day report,
pickup authorisation) · Notices · Messages (voice notes, meeting requests) · Fees (mock
Razorpay checkout → receipt) · Progress · Events + RSVP · Emergency & medical · Profile ·
Settings · Live cameras (restyled, DB-outage tolerant).

**Kids zone (§8.4) — 11 routes, 11 playable games**
Home with mascot picker · journey map with star-gated worlds · age-tiered catalogue ·
Balloon Pop · Shape Drop · Colour Sort · Animal Sounds · Counting · Patterns · Memory Match ·
Letter Tracing (canvas) · Word Builder · Math Adventure · Science Quiz · story player with
`speechSynthesis` narration · drawing canvas with stamps + saved gallery · Web Audio music
studio with recording · rewards locker. Stars, badges, streaks and sessions all persist.

**Public site (§8.1) + auth (§8.2)**
Admissions landing / 4-step application / visit booking with slot grid / seat availability ·
interactive campus tour with guided mode · events + detail · testimonials · blog + posts ·
careers with apply dialog · privacy · terms · branded 404 · forgot-password · OTP verification.
The home and admissions enquiry forms now write real leads into the admissions pipeline.

### Admin dashboard UI/UX — clean SaaS shell (2026-07-07)
- **Reusable admin shell:** fixed sidebar (desktop) + mobile drawer (Sheet) + sticky topbar with user chip & sign-out. Slate/white professional theme, brand-red active state. Nav config in `src/shared/constants/routes.ts` (`AdminSidebar`, `MobileSidebar`).
- **Data-driven Overview** (`/admin`): real KPIs (students, cameras on/total, parents, staff, views today, denials today) + recent CCTV activity feed + quick actions. Backed by `adminService.getOverview/recentCctvActivity`.
- **CCTV Audit log** (`/admin/audit`): full table of every authorize decision / token / view start, with user, role, camera, event badge, reason.
- Polished Cameras page to the slate theme. Placeholder nav items (Students/Staff/Fees/Notices/Settings) marked "soon".
- **Running locally without Docker:** Homebrew Postgres 14 (`brew services start postgresql@14`) instead of the Docker DB. Verified live: admin+parent auth, classroom-scoped access, token issuance, RBAC redirects, audit writes. Typecheck + lint clean. (MediaMTX/Docker still only needed for actual video pixels.)
- Backup snapshot at `../climbkiddo`; active work in `playschool`.

### ERP foundation + CCTV for parents (2026-07-07)
- **Layered backend** per the mandated tree: `src/backend/{services,repositories,validators,database,utils}`, `src/shared/{types,constants}`, `src/config/env.ts`. Route handlers live in `src/app/api/**` as thin adapters that delegate to services (Next.js only serves handlers under `app/`).
- **Database:** Prisma 7 + Postgres (pg driver adapter — Prisma 7 moved the URL out of `schema.prisma` into `prisma.config.ts`). Models: `Branch, User, Classroom, Student, Guardianship` + CCTV `Camera, CameraAccessGrant, SchoolHours, CctvViewLog`.
- **Auth + RBAC:** custom JWT (jose) session in an HttpOnly cookie, bcrypt passwords, roles `SUPER_ADMIN/ADMIN/TEACHER/PARENT`, permission map, proxy gating for `/parent · /teacher · /admin · /api/cctv` (GMS gating preserved). Routes: `/api/auth/{login,register,logout,me}`; pages `/login`, `/register`.
- **CCTV (selective parent access), end-to-end:**
  - Control plane issues **60s single-camera view tokens** after checking: camera enabled ∧ parent-viewable ∧ (grant ∨ child's-classroom) ∧ within branch school-hours. Every decision + view logged to `CctvViewLog`. Admin kill-switch per camera.
  - Media plane = **MediaMTX** (RTSP→WHEP/HLS) validating every stream via `/api/cctv/authorize`. RTSP creds never reach the browser.
  - Parent viewer `/parent/cctv` (WebRTC WHEP player). Admin `/admin/cameras` (add/map/kill-switch).
  - `infra/docker-compose.yml` — Postgres + MediaMTX + ffmpeg **test stream** → live demo with no hardware. Config in `infra/mediamtx.yml`.
  - Setup + architecture: [`docs/erp-cctv.md`](docs/erp-cctv.md). Env template: `.env.example`.
- Production `next build` green; new code lint-clean; token sign/verify (tamper + expiry rejection) smoke-tested.
- **Access model:** live only · child's classroom only · school-hours gated · no recordings.

### Foundation & branding
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 4
- shadcn/ui primitives wired (Button, Card, Badge, Sheet, Dialog, Tabs, Carousel, Accordion, etc.)
- Reactbits-style animation kit: SplitText, BlurText, ShinyText, GradientText, Aurora, FloatingShapes, Squares (canvas), DotGrid, Marquee, TiltedCard, Counter, ClickSpark, Magnet, AnimatedList
- Brand system: Climb Kiddo logo + mascots in `public/brand/`, full color tokens (red, orange, blue, magenta, green, cream, navy), Fredoka + Nunito + Baloo fonts
- Hover-rotate logo animation; mobile-safe Logo (tagline hides below `sm`, CTA hides below `sm`)
- Production build green, deployed on Vercel

### Public website (11 pages live)
- `/` — Home (Hero, Pillars, Programs, Activities, Why Us, Testimonials, FAQ, Contact)
- `/about` — Story + Promise + Values + Pillars
- `/programs` — Toddlers · Nursery · JKG · SKG · Summer Camp tabs
- `/activities` — Marquee + **Bangiya Sangeet Parishad Certification banner** + grouped activity cards
  - For all ages: Dance · Art · Taekwondo · Self Defence · Gymnastics
  - Creative Arts · Music & Movement · Sports & Strength · Life Skills
- `/abacus` — 8-level abacus journey + benefits + stats
- `/teachers-training` — Primary Teachers Training certification (6 modules, 120 hrs, placement support)
- `/why-us` — Stats + 6 reasons + FAQ
- `/parents` — Testimonials carousel + FAQ + Contact CTA
- `/gallery` — Live, reads from Vercel Blob manifest, category filter chips, hover captions
- `/contact` — Two branches (Kathgola, Dhakuria), phone, WhatsApp, booking form
- Sticky navbar with 9 nav items (collapses to hamburger sheet below `xl`)
- Footer: 3×4 grid of links, branch addresses, socials, contact info

### Gallery Management System (GMS)
- `/gms/login` — admin password gate, HMAC-signed HttpOnly cookie session
- `/gms` — dashboard: total/photo/video counts, last upload, recent thumbnails, category breakdown
- `/gms/gallery` — full CRUD:
  - Drag-and-drop multi-file upload (50MB cap, images + videos)
  - Per-upload caption + category
  - Edit caption/category in modal
  - Delete with confirm
  - Category filter chips
- API routes: `POST /api/gms/login`, `POST /api/gms/logout`, `GET/POST /api/gms/gallery`, `PATCH/DELETE /api/gms/gallery/[id]`
- `src/proxy.ts` (Next.js 16 convention) protects `/gms/*` and `/api/gms/*`
- Manifest stored at `gallery/_manifest.json` on Vercel Blob — captions, categories, sort order, content type
- Public `/gallery` is the consumer

### Docs
- `docs/sow/sow.md` and `docs/sow/sow.docx` — Master Scope of Work

### Env vars required on Vercel
Set for Production + Preview + Development. `src/config/env.ts` **throws on boot in
production** if any of the three secrets is missing, so all three are mandatory even
before CCTV video is wired up.

| Name | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string (`...-pooler...`) |
| `AUTH_SECRET` | yes | `openssl rand -hex 32` — signs the session JWT |
| `CCTV_TOKEN_SECRET` | yes | separate secret for 60s camera view tokens |
| `CCTV_INTERNAL_SECRET` | yes | MediaMTX publisher credential |
| `ADMIN_PASSWORD` | for `/gms` | password gate for the legacy gallery admin |
| `BLOB_READ_WRITE_TOKEN` | for `/gallery` | Vercel Blob |
| `MEDIAMTX_WHEP_URL` / `MEDIAMTX_HLS_URL` | only with a public MediaMTX | leave unset and the parent camera page shows a friendly empty state |
| `CCTV_AUTHORIZE_SECRET` | optional | locks the authorize hook to MediaMTX only |
| `CCTV_PUBLISHER_USER` | optional | defaults to `publisher` |

Migrations against Neon: use the **direct** host (drop `-pooler`) for
`prisma db push` / `migrate`, and the pooled host for the app at runtime.

---

## 🚧 In progress / immediate next steps

- **Set `ADMIN_PASSWORD` on Vercel** for Production + Preview + Development, then redeploy so `/gms/login` becomes usable.
- **Clean up the duplicate Vercel project** that's pointing at this same repo (keep the one with the live domain, delete the other, re-verify Blob is on the surviving project).
- **First content drop** into GMS: real campus photos and videos to replace the empty state.

---

## 📋 Backlog

### Content the school needs to provide
- Real campus photos (Kathgola + Dhakuria) to replace mascot placeholders
- Founder/director message and photo
- Real teacher photos + short bios
- Real parent testimonials (with consent + photos/videos)
- Actual fee structure per program
- Branch addresses with maps (Kathgola, Dhakuria — full street address, pincode)
- Privacy Policy / Terms / Safeguarding policy copy
- Careers page copy and openings (if any)
- Real annual day / event photos for Events section (when built)

### Public site polish — most items shipped 2026-07-27
- Embed Google Maps for both branches in `/contact`
- Social links wired (Instagram, Facebook, YouTube — currently `#` placeholders in footer)
- Blog section (`/blog`) — listing + post pages
- Events / Calendar page (`/events`) — RSVP, gallery per event
- Careers page (`/careers`)
- Privacy + Terms + Safeguarding pages
- 404 / not-found brand-themed page
- Open Graph + favicon refinements (currently using the JPEG logo as favicon)
- Sitemap.xml + robots.txt
- Lighthouse pass (target: LCP < 2.5s, accessibility 95+)

### Parent-facing features — UI built 2026-07-27, backend pending
- **Auth system for parents** (email/password, JWT, NextAuth)
- **Parent dashboard** — child overview, attendance, meals, naps, mood, growth
- **Daily activity feed** — teacher uploads + parent timeline
- **Attendance** — check-in/out logs, pickup authorization, QR pickup
- **Notice board** — circulars, announcements, push notifications
- **Parent-teacher messaging** — secure chat, voice notes, video consult booking
- **Fee payments** — Razorpay, invoices, receipts, reminders
- **Progress reports** — milestone tracking, printable PDFs
- **Emergency & safety** — emergency contact, medical/allergy info, broadcasts

### Teacher-facing features — UI built 2026-07-27, backend pending
- Teacher dashboard
- Class roster + attendance marker
- Activity uploads (will eventually share to parent feed)
- Lesson planning
- Per-student reports

### Admin-facing features — UI built 2026-07-27, backend pending
- Branch management (multi-branch admin)
- Students database (enroll, transfer, archive)
- Staff database
- Admissions pipeline (inquiries → applications → seat allocation → enrollment)
- Fee management (structures, invoicing, late-fee automation)
- CMS for editing the public site without code
- Analytics (attendance, fees, engagement, retention)
- Audit log

### Child Learning Zone — built 2026-07-27 (progress stored client-side)
- Kids landing with mascot picker
- Adventure-map journey progression
- Age-segmented games (2–3, 3–4, 4–5, 5–6)
- Storytelling module (animated, narration, read-along)
- Drawing & creativity canvas
- Music & rhythm
- Rewards / badges system
- AR learning (future)

### Mobile app (separate codebase)
- React Native (Expo) — Parent app
- Push notifications via FCM/APNs
- Offline cache for last feed + games
- App Store + Play Store submissions

### Backend infrastructure (when we start parent/teacher features)
- Prisma 7 + PostgreSQL (Neon) — schema design per SoW §11
- Auth.js (NextAuth) + JWT
- Background jobs (BullMQ + Upstash Redis) for notification fanout, media processing
- Email (Resend), SMS (MSG91/Twilio), WhatsApp Cloud API
- Razorpay integration for fees
- Media pipeline (Mux for video, Sharp for thumbnails)
- Sentry for error tracking

### Ops / DevOps
- Domain setup → point to Vercel (climbkiddo.in or similar)
- Custom email (hello@climbkiddo.in)
- Cloudflare in front of Vercel (optional, for WAF/cache)
- GitHub Actions CI (typecheck + lint on PRs)
- Staging environment vs production
- Backup strategy for Vercel Blob + DB (when DB exists)

---

## Known small fixes / nice-to-haves

- Marquee in `Activities` section uses CSS animation only — fine, but TanStack/Embla could give pause-on-hover with momentum (low priority)
- `Magnet` cursor effect doesn't trigger on touch devices (expected, but verify no jank)
- Confirm logo's right edge is fully visible on iPhone SE-class widths (~320px)
- Add `loading="lazy"` already in place for `<img>`; consider `next/image` swap when real photos arrive for AVIF/WebP

---

## Quick links

- **Live:** see Vercel dashboard for the surviving project URL
- **GMS:** `/gms/login` (admin only)
- **Gallery:** `/gallery` (public)
- **SoW:** [`docs/sow/sow.md`](docs/sow/sow.md)

---

*This file is the running source of truth — update it as work ships.*
