-- When the customer's card hold was placed. Stripe releases an uncaptured hold after 7 days,
-- so the admin pages show how long is left to confirm the booking.
ALTER TABLE "Booking" ADD COLUMN "authorizedAt" TIMESTAMP(3);
