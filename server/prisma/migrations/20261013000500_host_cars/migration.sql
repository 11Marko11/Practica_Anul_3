-- Hosts add and manage their own cars.

-- A car its host deleted: off the site, kept for the bookings that refer to it.
ALTER TYPE "CarStatus" ADD VALUE IF NOT EXISTS 'REMOVED';

ALTER TABLE "Car" ADD COLUMN "defects" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "Car" SET "defects" = ARRAY[]::TEXT[] WHERE "defects" IS NULL;
ALTER TABLE "Car" ALTER COLUMN "defects" SET NOT NULL;

CREATE TABLE "UploadedPhoto" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedPhoto_pkey" PRIMARY KEY ("id")
);
-- Not readable through Supabase's public Data API (see the first migration).
ALTER TABLE "UploadedPhoto" ENABLE ROW LEVEL SECURITY;

-- Every host gets a user account: "Irina F." → irina.f@rentmotors.md. The password hash '!'
-- matches no password, so nobody can sign in until an admin sets a password on the Hosts page.
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "verificationStatus", "verifiedAt", "updatedAt")
SELECT gen_random_uuid()::text, h."name",
       trim(both '.' from regexp_replace(lower(h."name"), '[^a-z0-9]+', '.', 'g')) || '@rentmotors.md',
       '!', 'CUSTOMER', 'VERIFIED', now(), now()
FROM "Host" h
WHERE h."userId" IS NULL
ON CONFLICT ("email") DO NOTHING;

UPDATE "Host" h SET "userId" = u."id"
FROM "User" u
WHERE h."userId" IS NULL
  AND u."passwordHash" = '!'
  AND u."email" = trim(both '.' from regexp_replace(lower(h."name"), '[^a-z0-9]+', '.', 'g')) || '@rentmotors.md'
  AND NOT EXISTS (SELECT 1 FROM "Host" o WHERE o."userId" = u."id");
