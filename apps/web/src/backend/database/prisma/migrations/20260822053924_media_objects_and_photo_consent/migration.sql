-- CreateTable
CREATE TABLE "MediaObject" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'image',
    "sizeBytes" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL DEFAULT '',
    "branchId" TEXT,
    "classroomId" TEXT,
    "uploadedById" TEXT,
    "scrubbed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoConsent" (
    "studentId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "decidedById" TEXT,
    "decidedByName" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoConsent_pkey" PRIMARY KEY ("studentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaObject_storageKey_key" ON "MediaObject"("storageKey");

-- CreateIndex
CREATE INDEX "MediaObject_branchId_createdAt_idx" ON "MediaObject"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaObject_classroomId_idx" ON "MediaObject"("classroomId");

-- CreateIndex
CREATE INDEX "PhotoConsent_allowed_idx" ON "PhotoConsent"("allowed");

-- AddForeignKey
ALTER TABLE "MediaObject" ADD CONSTRAINT "MediaObject_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaObject" ADD CONSTRAINT "MediaObject_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaObject" ADD CONSTRAINT "MediaObject_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoConsent" ADD CONSTRAINT "PhotoConsent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoConsent" ADD CONSTRAINT "PhotoConsent_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
