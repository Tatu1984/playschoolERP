# ERP Foundation + CCTV — Architecture & Setup

This document covers the ERP substrate (auth, DB, RBAC) and the **selective CCTV
access for parents** feature added on top of the existing Climb Kiddo site.

## Layered architecture (mandated structure)

```
Route adapter (src/app/api/**/route.ts)   ← thin: parse → validate → call service → respond
  → Validator (src/backend/validators)     ← Zod
  → Service   (src/backend/services)       ← business logic + RBAC + audit
  → Repository(src/backend/repositories)   ← Prisma queries only
  → DB        (src/backend/database)        ← Prisma 7 + pg adapter
Shared: src/shared/{types,constants}   Config: src/config/env.ts
Frontend feature UI: src/frontend/components/features/**
```

> **Framework note:** Next.js only serves route handlers from under `src/app/`.
> So `route.ts` files live there as *thin adapters* and delegate into
> `src/backend/services`. All real logic stays in the backend layer per the
> mandated tree. (The legacy marketing site + GMS keep using `src/components`
> and `src/lib` — untouched.)

> **Auth note:** The SOW names NextAuth. We implemented a lean custom
> JWT-in-HttpOnly-cookie auth (jose + bcrypt) because it is robust on Next.js 16
> today, matches the SOW's "JWT + HTTP-only cookies" data-flow, and mirrors the
> existing GMS cookie pattern. Swappable later without touching feature code.

## CCTV: two planes

Vercel is serverless and cannot transcode RTSP or hold long-lived video sockets,
so CCTV is split:

- **Control plane (this app):** auth, camera↔classroom mapping, guardian→child
  links, school-hours gating, admin grants/kill-switch, audit log, and issuing
  **short-lived (60s) single-camera view tokens**. RTSP URLs never reach a browser.
- **Media plane (MediaMTX):** ingests each camera/NVR RTSP feed and republishes
  as **WebRTC (WHEP)** for the browser (HLS fallback). It calls our
  `/api/cctv/authorize` hook to validate **every** read/publish.

### Parent view flow

```
Parent opens /parent/cctv
  → RSC calls cctvService.listForParent(userId)      (classroom-derived cameras)
  → clicks "Watch live" on a camera
  → POST /api/cctv/view-token { cameraId }
      → cctvService.issueViewToken() checks, in order:
          camera.enabled ∧ parentViewable ∧
          (explicit grant OR camera.classroomId ∈ parent's children's classrooms) ∧
          now ∈ branch school-hours (evaluated in branch timezone)
      → logs AUTHORIZE_GRANTED/DENIED, mints a 60s JWT bound to {userId,cameraId,streamPath}
  → browser opens WHEP to MEDIAMTX_WHEP_URL/<streamPath>/whep  (Authorization: Bearer <token>)
      → MediaMTX POSTs credentials to /api/cctv/authorize
          → re-validates token + path + camera.enabled, logs VIEW_START, returns 200
  → live WebRTC stream flows peer-to-peer
```

Access model (as configured): **live only, child's classroom only, school-hours
gated, no recordings.** Admins can flip a camera off instantly (kill-switch) and
mark cameras staff-only (`parentViewable=false`).

## Data model (Prisma)

`Branch · User · Classroom · Student · Guardianship` (foundation) +
`Camera · CameraAccessGrant · SchoolHours · CctvViewLog` (CCTV). See
`src/backend/database/prisma/schema.prisma`.

## Local setup

```bash
# 1. Env — copy and (optionally) edit secrets. CCTV_INTERNAL_SECRET must match
#    the value used by the ffmpeg test publisher in docker-compose.
cp .env.example .env            # or .env.local

# 2. Bring up Postgres + MediaMTX + the ffmpeg test stream
npm run infra:up

# 3. Create the schema + seed demo data (branch, classroom, admin, parent, camera)
npm run db:push
npm run db:seed

# 4. Run the app (host — reachable by MediaMTX at host.docker.internal:3000)
npm run dev
```

Seeded logins (password `password12345`):

| Role   | Email                   | Lands on        |
| ------ | ----------------------- | --------------- |
| Admin  | `admin@climbkiddo.in`   | `/admin`        |
| Parent | `parent@example.com`    | `/parent`       |

Then:

- **Parent:** sign in → `/parent/cctv` → **Watch live** on “Toddler Room — Live”.
- **Admin:** sign in → `/admin/cameras` → add cameras, map to classrooms, toggle
  the live kill-switch.

### Connecting real cameras (prod)

For each physical camera/NVR, add a `Camera` with its `rtspUrl` and a unique
`streamPath`, and configure a matching MediaMTX path with
`source: rtsp://user:pass@nvr-ip:554/…` (via `infra/mediamtx.yml` or the MediaMTX
API). Point `MEDIAMTX_WHEP_URL` at the deployed MediaMTX (behind TLS). MediaMTX
runs on a box on the school LAN (with reach to the cameras) or a VPS.

## Env vars

See `.env.example`. Key ones: `DATABASE_URL`, `AUTH_SECRET`, `CCTV_TOKEN_SECRET`,
`MEDIAMTX_WHEP_URL`, `CCTV_PUBLISHER_USER`, `CCTV_INTERNAL_SECRET`,
optional `CCTV_AUTHORIZE_SECRET` (locks the authorize hook to MediaMTX only).
