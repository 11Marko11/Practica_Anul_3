-- Customers ask the admin to become hosts, with extra documents.

CREATE TYPE "HostApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "HostDocumentType" AS ENUM ('BUSINESS_REGISTRATION', 'BANK_DETAILS');

ALTER TABLE "User"
    ADD COLUMN "hostApplicationStatus" "HostApplicationStatus",
    ADD COLUMN "hostApplicationMessage" TEXT,
    ADD COLUMN "hostApplicationNote" TEXT,
    ADD COLUMN "hostApplicationSubmittedAt" TIMESTAMP(3);

CREATE TABLE "HostDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "HostDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HostDocument_userId_idx" ON "HostDocument"("userId");
ALTER TABLE "HostDocument" ADD CONSTRAINT "HostDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Not readable through Supabase's public Data API (see the first migration).
ALTER TABLE "HostDocument" ENABLE ROW LEVEL SECURITY;

-- People who already are hosts count as approved.
UPDATE "User" u SET "hostApplicationStatus" = 'APPROVED'
WHERE EXISTS (SELECT 1 FROM "Host" h WHERE h."userId" = u."id");
