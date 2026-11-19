-- Hosts review their customers after a finished trip (stars and a comment, once per trip).
CREATE TABLE "CustomerReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "hostId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerReview_bookingId_key" ON "CustomerReview"("bookingId");
CREATE INDEX "CustomerReview_customerId_createdAt_idx" ON "CustomerReview"("customerId", "createdAt");

ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
