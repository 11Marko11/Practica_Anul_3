-- Affordable cars: diesel engines and front-wheel drive; credits for photos that need attribution.
-- (New enum values must be committed before a later migration can use them.)
ALTER TYPE "Fuel" ADD VALUE IF NOT EXISTS 'Diesel' AFTER 'Petrol';
ALTER TYPE "Drive" ADD VALUE IF NOT EXISTS 'FWD';

ALTER TABLE "CarPhoto" ADD COLUMN "credit" TEXT, ADD COLUMN "creditUrl" TEXT;
