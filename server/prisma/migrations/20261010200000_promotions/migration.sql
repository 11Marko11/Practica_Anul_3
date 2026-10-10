-- Advertising banners for the home page and the car list, managed from the admin pages.
CREATE TYPE "PromotionPlacement" AS ENUM ('HOME', 'MARKETPLACE');

CREATE TABLE "Promotion" (
    "id" SERIAL NOT NULL,
    "placement" "PromotionPlacement" NOT NULL,
    "texts" JSONB NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsOn" DATE,
    "endsOn" DATE,
    "position" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Promotion_placement_active_idx" ON "Promotion"("placement", "active");

-- Not readable through Supabase's public Data API (see the first migration).
ALTER TABLE "Promotion" ENABLE ROW LEVEL SECURITY;
