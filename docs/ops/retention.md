# What is kept, for how long, and what still needs deciding

Written 2026-08-22, alongside the first thing in this product that deletes
anything.

Two halves. The first is **implemented and running nightly**. The second is a
list of decisions that need a school and a lawyer, not a developer — written
down here rather than left implicit, because "we never got round to deleting
it" is not a defence anybody wants to make under the DPDP Act.

---

## Implemented: the nightly prune

`GET /api/cron/retention`, run by Vercel Cron at 21:00 UTC — 02:30 in
Asia/Kolkata, which is the quietest hour for an Indian school. Authenticated by
`CRON_SECRET`; in production, no secret means nobody may call it, because an
endpoint that deletes rows and defaults to open is worse than a job that never
runs.

| What | Kept for | Why that period |
|---|---|---|
| Rate-limit counters | 24 hours | Nothing reads an expired window; the upsert overwrites it. Purely about not keeping a row per address for ever. |
| Password reset tokens | 7 days past expiry | A spent token is a dead credential. The week lets support still answer "was a reset requested for this account?" while the conversation is live. |
| CCTV view log | `CCTV_LOG_RETENTION_DAYS`, default 365 | This is the record that answers *"did a member of staff sit watching one child"*. It outlives the footage on purpose. |
| Notification delivery records | `DELIVERY_LOG_RETENTION_DAYS`, default 180 | Useful for weeks after a broadcast ("who did not get it"), useless after months, and it is one row per recipient per channel. |
| Read notifications | `NOTIFICATION_RETENTION_DAYS`, default 120 | Already seen. |

**Never deleted by the job:** an unread notification, whatever its age. An
unread emergency broadcast from four months ago is something somebody should
still see, and deleting it would hide the failure rather than fix it.

**Also never touched:** anything about a child — records, medical notes,
invoices, photographs, messages, attendance. That is the second half.

The defaults above are a starting position, not advice. A school's own
retention policy overrides them, and each is an environment variable so that
changing it is a deployment setting rather than a code change.

---

## Not implemented: what happens when a child leaves

This is the part that needs a decision. Each question below has a legal answer
in India that this repository is not qualified to give, and each one is
currently answered by default as "keep everything for ever", which is the wrong
answer to all of them.

- **How long after a family leaves are the child's records kept?** Admission
  records, attendance and fee history plausibly have a statutory minimum. Photos
  and messages plausibly have a maximum.
- **What must be archived rather than deleted?** An archive that the ERP cannot
  read is a different thing from a row in the ERP, and safer for both sides.
- **CCTV footage itself.** MediaMTX keeps whatever its configuration says;
  nothing in this repository controls it. Thirty days is the usual figure for a
  nursery. Somebody has to confirm what the recorder is actually set to — the
  access log above is retained for a year, which is only meaningful if the
  footage it refers to outlived the incident it might be needed for.
- **Photographs after consent is withdrawn.** Today, withdrawing consent stops a
  child appearing in *new* photographed posts. It does not remove them from
  posts already published. That is a defensible reading — the photograph was
  taken with permission — and it is a reading, not a fact, and the family should
  be told which one the school has chosen.
- **A subject access request.** What a parent may ask for, and how it is
  produced. Nothing in the product assembles it today.

## Not implemented: backups

Neon offers point-in-time restore. Nobody in this repository can confirm it is
switched on, what the retention window is, or that a restore works — those need
someone with access to the Neon console.

**A backup nobody has restored is a hypothesis.** The drill:

1. Restore a point-in-time copy into a scratch database.
2. Point `DATABASE_URL` at it and run `npm run test:integration`. 218 assertions
   against real data is a stronger check than opening a table and looking.
3. Write down the RTO and RPO the restore actually achieved, not the ones the
   marketing page claims.
4. Write down who is called, and at what hour.

Until that has been done once, this product has no recovery plan — it has a
provider feature it has never used.
