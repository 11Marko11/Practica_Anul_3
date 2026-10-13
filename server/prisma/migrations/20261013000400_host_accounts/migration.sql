-- A host can be tied to a user account (the host role): that user then follows the host's
-- cars, bookings and reviews on the host pages.
ALTER TABLE "Host" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Host_userId_key" ON "Host"("userId");
ALTER TABLE "Host" ADD CONSTRAINT "Host_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
