-- Hosts get their own table: until now each car kept its own copy of the host's name, rating and
-- trips, so the same host showed different numbers on different cars.
CREATE TABLE "Host" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "trips" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- One host per name. Trips add up over the host's cars; the rating is the average of the
-- per-car ratings weighted by their trips (one rating per trip).
INSERT INTO "Host" ("name", "rating", "ratingCount", "trips")
SELECT "hostName",
       ROUND((SUM("hostRating" * GREATEST("hostTrips", 1)) / SUM(GREATEST("hostTrips", 1)))::numeric, 2),
       SUM("hostTrips"),
       SUM("hostTrips")
FROM "Car"
GROUP BY "hostName"
ORDER BY MIN("id");

ALTER TABLE "Car" ADD COLUMN "hostId" INTEGER;
UPDATE "Car" c SET "hostId" = h."id" FROM "Host" h WHERE h."name" = c."hostName";
ALTER TABLE "Car" ALTER COLUMN "hostId" SET NOT NULL;
ALTER TABLE "Car" ADD CONSTRAINT "Car_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Car_hostId_idx" ON "Car"("hostId");

ALTER TABLE "Car" DROP COLUMN "hostName", DROP COLUMN "hostRating", DROP COLUMN "hostTrips";

-- Not readable through Supabase's public Data API (see the first migration).
ALTER TABLE "Host" ENABLE ROW LEVEL SECURITY;
