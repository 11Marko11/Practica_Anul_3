-- A host's rating and trips are calculated from the reviews and completed bookings of their
-- cars every time they are shown, so the stored numbers are dropped.
ALTER TABLE "Host" DROP COLUMN "rating", DROP COLUMN "ratingCount", DROP COLUMN "trips";
