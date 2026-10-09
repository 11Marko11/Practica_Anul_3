-- Customers can delete their account; the row stays (bookings and payments need it) but is marked.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedEmail" TEXT;
