-- Where the car was left at the end of a trip, and who ended it.
ALTER TABLE "Booking"
    ADD COLUMN "returnAddress" TEXT,
    ADD COLUMN "returnLat" DOUBLE PRECISION,
    ADD COLUMN "returnLng" DOUBLE PRECISION,
    ADD COLUMN "completedAt" TIMESTAMP(3),
    ADD COLUMN "completedBy" "CancelledBy";
