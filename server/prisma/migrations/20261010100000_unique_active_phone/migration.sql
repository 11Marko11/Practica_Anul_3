-- One phone number per active account. Numbers are normalised to "+37369123456" first
-- (the same rules as the server's normalizePhone), then made unique among accounts that
-- are not deleted. Deleted accounts keep their number but no longer block it.

-- 1. Normalise numbers saved from the profile page before this rule existed.
UPDATE "User" SET "phone" = NULL WHERE "phone" IS NOT NULL AND regexp_replace("phone", '\D', '', 'g') = '';
UPDATE "User" SET "phone" = CASE
    WHEN "phone" ~ '^\s*00' THEN '+' || regexp_replace(regexp_replace("phone", '\D', '', 'g'), '^00', '')
    WHEN "phone" ~ '^\s*\+' THEN '+' || regexp_replace("phone", '\D', '', 'g')
    WHEN regexp_replace("phone", '\D', '', 'g') ~ '^0\d{8}$' THEN '+373' || substr(regexp_replace("phone", '\D', '', 'g'), 2)
    WHEN regexp_replace("phone", '\D', '', 'g') ~ '^\d{8}$' THEN '+373' || regexp_replace("phone", '\D', '', 'g')
    ELSE '+' || regexp_replace("phone", '\D', '', 'g')
  END
WHERE "phone" IS NOT NULL;

-- 2. If two active accounts already share a number, keep it on the oldest one only.
UPDATE "User" SET "phone" = NULL WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (PARTITION BY "phone" ORDER BY "createdAt") AS n
    FROM "User" WHERE "phone" IS NOT NULL AND "deletedAt" IS NULL
  ) ranked WHERE n > 1
);

-- 3. The rule itself (also protects against two sign-ups at the same moment).
CREATE UNIQUE INDEX "User_phone_active_key" ON "User"("phone") WHERE "deletedAt" IS NULL AND "phone" IS NOT NULL;
