-- Who cancelled a booking, when and why (customers before confirmation, the admin after).
CREATE TYPE "CancelledBy" AS ENUM ('CUSTOMER', 'ADMIN');

ALTER TABLE "Booking"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledBy" "CancelledBy",
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "cancelNote" TEXT;

-- Bookings cancelled before this change were all cancelled by their customer.
UPDATE "Booking" SET "cancelledBy" = 'CUSTOMER', "cancelledAt" = "updatedAt" WHERE "status" = 'CANCELLED';
