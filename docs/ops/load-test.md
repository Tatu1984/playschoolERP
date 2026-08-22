# What this costs at four hundred children

Measured 2026-08-22 on a laptop (M-series, Postgres 14 local). Absolute times on
Vercel + Neon will differ; the **shape** — which query is slow, and where the
bytes are — will not.

Reproduce:

```bash
createdb playschool_load
export DATABASE_URL=postgresql://playschool:playschool@localhost:5432/playschool_load
npx prisma migrate deploy --schema apps/web/src/backend/database/prisma/schema.prisma
npm run load:seed  --workspace=@climbkiddo/web   # ~20s
npm run load:measure --workspace=@climbkiddo/web
```

The dataset: 2 branches, 16 classrooms, **400 children**, 20 staff, 100,000
attendance rows (a full academic year), 24,000 messages (two years), 3,200 feed
posts, 3,200 invoices, 16,000 notifications.

## What it found

The bootstrap was fast and enormous. Time was never the problem; the payload
was.

| Snapshot | Before | After |
|---|---|---|
| Parent | 12ms, 0.06MB | unchanged |
| Teacher | 31ms, 1.12MB | unchanged |
| Admin | 166ms, **7.95MB**, truncated | 67ms, **2.39MB**, complete |

Eight megabytes is roughly **twenty seconds on a 3G connection** at a school
gate — and it was *truncated*, so it was slow and incomplete at once. Both the
attendance cap (20,000) and the message cap (2,000) were hit by a single
ordinary year.

**The change:** admins get a 21-day bootstrap window instead of 120 days
(`ADMIN_WINDOW_DAYS` in `bootstrap.service.ts`). An admin's screens ask "how is
the school today" — who is in, what is outstanding, what happened this week. The
term-scale questions are answered by the analytics snapshot, which aggregates
server-side in 3ms, and by the per-resource endpoints, which take filters. A
parent's window stays at 120 days because a parent's window is one child, and
one child is 60KB.

## After the attendance slice (same run, 2026-08-22)

Admins stopped receiving attendance rows at all; they receive counts computed
by Postgres (`attendanceService.summary`). **0.96MB, complete.** Down from 7.95.

| Collection | Rows | KB |
|---|---|---|
| invoices | 1,600 | 578 |
| messages | 400 | 114 |
| students | 200 | 96 |
| conversations | 200 | 73 |
| guardians | 200 | 61 |

Invoices are now the biggest thing an admin downloads, and they too are only
ever summed. That is where the next slice of §4.2 should go, and this is how to
judge it.

## Where an admin's 2.39MB went before that

| Collection | Rows | KB |
|---|---|---|
| attendance | 4,400 | 1,478 |
| invoices | 1,600 | 578 |
| messages | 400 | 114 |
| students | 200 | 96 |
| conversations | 200 | 73 |
| guardians | 200 | 61 |

Attendance is still two-thirds of it, at ~340 bytes a row for what is
essentially a child id, a date and a word. Shrinking the window further trades
against the admin screens that read it. **The real fix is per-screen fetching**
(POA §4.2): the dashboard needs today's register and an aggregate, not a
fortnight of rows. This measurement is what that work should be aimed at, and
what it should be measured against afterwards.

## Something else it found

Pointing the harness at a database with migrations applied and no rows made the
whole portal 500 for every role: `opsService.settings()` threw a `NotFoundError`
when the singleton settings row was missing, and the bootstrap loads it for
everybody. That is precisely the state a **first production deploy** is in.
Settings now fall back to defaults, and the settings screen upserts.

A load test that only measures is half a load test.

## Not measured yet

- **Concurrency.** One caller at a time. Twenty parents at 8:45am on one
  instance is a different question, and needs a real load generator against a
  deployed environment rather than a script against localhost.
- **Neon's latency.** Every figure above is a local socket. A managed Postgres
  across a network adds a round trip per query, and the bootstrap makes many.
- **Cold starts.** Measured warm, on purpose. The first request after a deploy
  is slow everywhere and says nothing about the shape of a query.
