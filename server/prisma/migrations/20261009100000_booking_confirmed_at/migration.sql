-- When the admin confirmed a booking (and the money was charged), for the dashboard's revenue.
ALTER TABLE "Booking" ADD COLUMN "confirmedAt" TIMESTAMP(3);
CREATE INDEX "Booking_confirmedAt_idx" ON "Booking"("confirmedAt");

-- Bookings confirmed before this column existed: their last change is the best estimate.
UPDATE "Booking" SET "confirmedAt" = "updatedAt" WHERE "status" IN ('CONFIRMED', 'COMPLETED');
