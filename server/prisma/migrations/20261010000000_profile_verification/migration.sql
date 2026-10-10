-- Customer profile (phone, birth date), identity verification and uploaded documents.
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "DocumentType" AS ENUM ('ID_CARD', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER');

ALTER TABLE "User"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "birthDate" DATE,
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- Admins don't book, and should not be blocked by the new rule.
UPDATE "User" SET "verificationStatus" = 'VERIFIED', "verifiedAt" = CURRENT_TIMESTAMP WHERE "role" = 'ADMIN';

CREATE TABLE "IdentityDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IdentityDocument_userId_idx" ON "IdentityDocument"("userId");
ALTER TABLE "IdentityDocument" ADD CONSTRAINT "IdentityDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Identity documents must never be readable through Supabase's public Data API.
ALTER TABLE "IdentityDocument" ENABLE ROW LEVEL SECURITY;
