# What personal data this product holds, and where it goes

Written 2026-08-22. **This is not a DPIA.** It is the inventory a DPIA needs —
the engineering half, written down so that the person doing the legal half is
not reverse-engineering a Prisma schema at their own hourly rate.

Everything below was read out of `schema.prisma` and the service layer on that
date. Where a question is legal rather than technical, it is marked **[needs a
lawyer]** rather than answered.

Scope: the Climb Kiddo ERP and its CCTV control plane. The media plane
(MediaMTX, and the recordings themselves) is separate infrastructure that this
repository only issues tokens for — see `docs/erp-cctv.md`.

---

## 1. Categories of data subject

| Who | What is held about them |
|---|---|
| **Children** (under 6) | Name, date of birth, gender, admission number, photograph metadata, classroom, attendance, medical profile, allergies, milestones, artwork, feed posts, CCTV appearance |
| **Parents and guardians** | Name, email, phone, address, relation, login credentials, messages, payment records, device tokens |
| **Staff** | Name, email, phone, designation, salary, login credentials, what they did (audit trail), what they watched (CCTV log) |
| **Enquirers** | Anyone who filled in a public form: name, phone, email, child's name and date of birth — before any relationship exists |

Children's data is the sensitive core, and under the **DPDP Act 2023** it
attracts specific obligations (verifiable parental consent; no tracking or
behavioural monitoring; no targeted advertising). Two categories deserve naming
separately:

- **`MedicalProfile` / `EmergencyContact` / `Student.allergies`** — health data.
- **CCTV** — live video of identifiable children, which is the highest-risk
  processing in the product by a distance.

## 2. Where it lives

| Store | Contents | Location |
|---|---|---|
| Neon Postgres | Everything in `schema.prisma` | **[needs confirming]** — which region is the project in? |
| Vercel Blob (private) | Uploaded photographs, EXIF stripped | **[needs confirming]** — region |
| Vercel (compute + logs) | Request logs, structured application logs | Logs are redacted (`logger.util.ts`) but not absent |
| MediaMTX host | CCTV streams and any recordings | Self-hosted; retention set outside this repository |
| Resend | Transactional email in transit and in their logs | Third country **[needs a lawyer]** |
| Expo push service | Notification title and body, device tokens | Third country **[needs a lawyer]** |
| Razorpay | Payment identifiers and amounts; **never card details** | India |
| Sentry (if configured) | Error messages, stack traces, redacted context | **[needs confirming]** — region, and whether it is enabled at all |

Data leaves the product to exactly four third parties: Resend, Expo, Razorpay,
and (optionally) Sentry. Each is a driver behind one interface, so the list is
enumerable rather than a guess — `backend/integrations/`.

## 3. What the product does with it

| Purpose | Data used | Retained |
|---|---|---|
| Register, and reporting attendance | Child, classroom, dates | Not deleted today **[needs a lawyer]** |
| Daily feed | Photographs, child tags | Not deleted today **[needs a lawyer]** |
| Fees | Invoices, payments, gateway ids | Not deleted today; tax law likely sets a floor **[needs a lawyer]** |
| Messaging | Message bodies between staff and parents | Not deleted today |
| Live CCTV | Camera-to-classroom map, parent's children | View log: 365 days (configurable) |
| Safety broadcasts | Recipient list, delivery outcome | Delivery records: 180 days |
| Sign-in and security | Password hashes, session validity, rate-limit counters, audit trail | Counters: 24h. Audit trail: not deleted today |

The nightly retention job (`docs/ops/retention.md`) currently deletes only
operational exhaust. **Nothing about a child is ever deleted.** That is the
single largest gap between this product and a compliant one.

## 4. Access, and how it is enforced

- One place decides who may see what: `backend/utils/scope.util.ts`. A parent
  sees their own children; a teacher their own rooms; an admin their own branch;
  SUPER_ADMIN everything.
- Every by-id read of a child's record passes `canSeeStudent`. This is tested
  from the attacker's side — 32 assertions in `tests/integration/scoping.test.ts`
  that each take a real login and a real id it has no business touching.
- The proxy is **not** a security boundary; every API route re-derives scope in
  the service layer.
- Photographs are private blobs served only through `/api/media/[id]` after a
  scope check.
- CCTV needs a short-lived signed token per camera, and every grant *and denial*
  is written to `CctvViewLog`.

## 5. Consent

- **Photography**: `PhotoConsent`, per child, recorded with who decided it and
  when. Absence is a refusal. A photographed post cannot name a child without
  consent on file.
- **Notifications**: `NotificationPreference`, per channel, plus quiet hours. A
  CRITICAL safety broadcast overrides quiet hours and muted kinds but not a
  channel switched off. **[needs a lawyer]** — is that override defensible, and
  does the settings screen say so plainly enough?
- **Everything else**: there is no consent record for the processing itself.
  Enrolment is treated as the basis, which is an assumption nobody has written
  down. **[needs a lawyer]**

## 6. Known gaps, stated plainly

1. **No erasure path.** Nothing deletes a child's records, ever. No mechanism,
   no policy.
2. **No subject access path.** A parent asking for everything held about their
   child would be answered by hand, by someone with database access.
3. **No consent record for enrolment-time processing**, and no versioning of
   what was agreed to.
4. **Withdrawing photo consent does not unpublish existing posts.** Defensible;
   undocumented to families.
5. **No DPIA for the CCTV plane**, which is the highest-risk processing here.
6. **No named data controller and no breach-notification procedure.**
7. **Third-country transfers** (Resend, Expo, possibly Sentry) have not been
   assessed.
8. **No retention period for a child's records** — see 1.

Items 1, 2, 5, 6 and 8 are, in the author's non-legal opinion, the ones that
should block a launch that holds real children's records.
