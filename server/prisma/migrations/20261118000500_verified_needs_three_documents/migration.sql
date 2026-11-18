-- Verified only with the ID card, the passport and the driving licence. Accounts verified
-- without all three go back to unverified and have to upload what is missing.
UPDATE "User" u
SET "verificationStatus" = 'UNVERIFIED', "verifiedAt" = NULL, "verificationSubmittedAt" = NULL
WHERE u."verificationStatus" IN ('VERIFIED', 'PENDING')
  AND u."role" <> 'ADMIN'
  AND (
    SELECT COUNT(DISTINCT d."type") FROM "IdentityDocument" d
    WHERE d."userId" = u."id" AND d."type" IN ('ID_CARD', 'PASSPORT', 'DRIVING_LICENSE')
  ) < 3;
