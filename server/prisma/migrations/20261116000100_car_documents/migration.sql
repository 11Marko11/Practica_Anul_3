-- Each car needs its papers (registration certificate and RCA insurance), checked by the admin.

ALTER TYPE "HostDocumentType" ADD VALUE IF NOT EXISTS 'CAR_REGISTRATION';
ALTER TYPE "HostDocumentType" ADD VALUE IF NOT EXISTS 'CAR_INSURANCE';
ALTER TYPE "HostDocumentType" ADD VALUE IF NOT EXISTS 'CAR_OWNERSHIP';

ALTER TABLE "HostDocument" ADD COLUMN "carId" INTEGER;
CREATE INDEX "HostDocument_carId_idx" ON "HostDocument"("carId");
ALTER TABLE "HostDocument" ADD CONSTRAINT "HostDocument_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "CarReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Cars already on the site stay there: they count as checked.
ALTER TABLE "Car"
    ADD COLUMN "reviewStatus" "CarReviewStatus" NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN "reviewNote" TEXT,
    ADD COLUMN "reviewSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Car" ALTER COLUMN "reviewStatus" SET DEFAULT 'PENDING';
