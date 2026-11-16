-- Hosts pay Rent Motors a share of their income; users get notifications.

ALTER TABLE "Host" ADD COLUMN "commissionRate" INTEGER NOT NULL DEFAULT 10;

-- Each confirmed booking keeps the rate in force when it was confirmed. Past ones: the default 10%.
ALTER TABLE "Booking" ADD COLUMN "commissionRate" INTEGER;
UPDATE "Booking" SET "commissionRate" = 10 WHERE "confirmedAt" IS NOT NULL;

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Not readable through Supabase's public Data API (see the first migration).
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
