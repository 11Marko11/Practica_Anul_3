-- Editable page texts (About, Contact), managed from the admin pages.
CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);

-- Not readable through Supabase's public Data API (see the first migration).
ALTER TABLE "SiteContent" ENABLE ROW LEVEL SECURITY;
