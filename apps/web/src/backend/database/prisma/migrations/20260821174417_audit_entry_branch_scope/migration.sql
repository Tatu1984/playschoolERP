-- AlterTable
ALTER TABLE "AuditEntry" ADD COLUMN     "branchId" TEXT;

-- CreateIndex
CREATE INDEX "AuditEntry_branchId_createdAt_idx" ON "AuditEntry"("branchId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
