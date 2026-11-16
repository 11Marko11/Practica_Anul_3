-- Hosts now confirm or reject the bookings of their cars.
ALTER TYPE "CancelledBy" ADD VALUE IF NOT EXISTS 'HOST';
