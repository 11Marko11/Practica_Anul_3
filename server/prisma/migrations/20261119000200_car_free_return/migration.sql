-- The host chooses whether customers may leave the car anywhere or must bring it back to the
-- pick-up address. Cars so far allowed leaving it anywhere.
ALTER TABLE "Car" ADD COLUMN "freeReturn" BOOLEAN NOT NULL DEFAULT true;
