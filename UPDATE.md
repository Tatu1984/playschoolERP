# Climb Kiddo — Project Update

**Last updated:** 2026-07-08
**Repo:** [Tatu1984/playschool](https://github.com/Tatu1984/playschool)
**Branches:** `main` (production-tracked by Vercel)
**Working dir:** `/Users/sudipto/Desktop/projects/playschool` · **Backup snapshot:** `/Users/sudipto/Desktop/projects/climbkiddo`

---

## ▶ RESUME HERE — after a system restart

Nothing is committed to git yet (all new work is in the working tree). After a reboot,
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

**Demo logins** (password `password12345`): admin `admin@climbkiddo.in` → `/admin` · parent `parent@example.com` → `/parent` → **/parent/cctv** → *Watch live*.

If demo data is ever wiped: `npm run db:push && npm run db:seed`.

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

## 🔜 Future work / next steps (in priority order)

1. **Confirm CCTV video in the browser** at `/parent/cctv`; if WebRTC struggles through Colima,
   add an **HLS fallback** to `LiveCameraPlayer` (hls.js) — most robust cross-browser path.
2. **Students module** (`/admin/students`): enroll/list/edit, assign to classroom, link guardians.
   Unlocks real parent↔camera mapping without seeding, plus attendance/admissions later.
3. **Staff module** (`/admin/staff`): create teachers/admins, assign branch.
4. **CCTV admin polish:** per-parent access grants/revocations UI (`CameraAccessGrant` exists in
   schema, no UI yet); edit/delete camera; school-hours editor per branch.
5. **Parent portal polish** to match the admin SaaS quality (dashboard is currently basic).
6. **Proper migrations:** switch from `prisma db push` to `prisma migrate dev` before any real data.
7. **Then the SOW ERP modules** in order: Attendance (QR pickup) → Activity Feed → Notices →
   Fees (Razorpay) → Messaging → Progress reports → Admissions → Analytics/CMS → Kids zone.
8. **Ops:** `git` commit on a feature branch; CI (typecheck+lint); Neon DB for staging/prod;
   deploy MediaMTX; swap NextAuth decision doc if ever needed.

### Known deviations from SOW (intentional, documented)
- **Auth:** custom JWT (jose) + bcrypt in an HttpOnly cookie, not NextAuth (robust on Next 16).
- **Route handlers:** physically in `src/app/api/**` as thin adapters delegating to
  `src/backend/services` (Next.js only serves handlers under `app/`); rest of the mandated tree honored.
- **Local infra:** Homebrew Postgres (not the compose Postgres) since Docker wasn't preinstalled.

---

## ✅ Done

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
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (connected ✅)
- `ADMIN_PASSWORD` — GMS sign-in password (pending — needs to be set in Vercel env vars)

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

### Public site polish
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

### Parent-facing features (per SoW, not yet built)
- **Auth system for parents** (email/password, JWT, NextAuth)
- **Parent dashboard** — child overview, attendance, meals, naps, mood, growth
- **Daily activity feed** — teacher uploads + parent timeline
- **Attendance** — check-in/out logs, pickup authorization, QR pickup
- **Notice board** — circulars, announcements, push notifications
- **Parent-teacher messaging** — secure chat, voice notes, video consult booking
- **Fee payments** — Razorpay, invoices, receipts, reminders
- **Progress reports** — milestone tracking, printable PDFs
- **Emergency & safety** — emergency contact, medical/allergy info, broadcasts

### Teacher-facing features
- Teacher dashboard
- Class roster + attendance marker
- Activity uploads (will eventually share to parent feed)
- Lesson planning
- Per-student reports

### Admin-facing features (beyond GMS)
- Branch management (multi-branch admin)
- Students database (enroll, transfer, archive)
- Staff database
- Admissions pipeline (inquiries → applications → seat allocation → enrollment)
- Fee management (structures, invoicing, late-fee automation)
- CMS for editing the public site without code
- Analytics (attendance, fees, engagement, retention)
- Audit log

### Child Learning Zone (later phase)
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
