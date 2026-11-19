-- The host chooses whether they deliver the car. Cars so far offered delivery.
ALTER TABLE "Car" ADD COLUMN "delivery" BOOLEAN NOT NULL DEFAULT true;
