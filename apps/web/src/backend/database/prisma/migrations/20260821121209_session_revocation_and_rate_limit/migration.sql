-- AlterTable
-- Nullable, and no database-side default. These columns are `timestamp without
-- time zone`, so DEFAULT CURRENT_TIMESTAMP would record the server's *local*
-- wall clock, which Prisma reads back as UTC: on a database set to a non-UTC
-- zone every existing user is backfilled with a future instant and every
-- session they hold is refused as older than it. NULL means "never revoked",
-- and the value is written from the application, where a Date is an instant.
ALTER TABLE "User" ADD COLUMN     "sessionsValidFrom" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_bucket_key_key" ON "RateLimit"("bucket", "key");
