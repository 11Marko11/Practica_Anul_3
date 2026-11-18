-- Whether a car can be rented now (cleaning, at the garage…), set by its host.
CREATE TYPE "CarCondition" AS ENUM ('READY', 'CLEANING', 'NEEDS_CLEANING', 'NEEDS_CHECK', 'IN_SERVICE', 'DAMAGED', 'OTHER');

ALTER TABLE "Car"
    ADD COLUMN "condition" "CarCondition" NOT NULL DEFAULT 'READY',
    ADD COLUMN "conditionNote" TEXT,
    ADD COLUMN "conditionSince" TIMESTAMP(3);
