-- The car's body type (sedan, SUV…), chosen by the host; empty for the cars saved before.
CREATE TYPE "BodyType" AS ENUM ('SEDAN', 'HATCHBACK', 'WAGON', 'SUV', 'CROSSOVER', 'COUPE', 'CONVERTIBLE', 'MINIVAN', 'PICKUP', 'VAN');
ALTER TABLE "Car" ADD COLUMN "bodyType" "BodyType";
