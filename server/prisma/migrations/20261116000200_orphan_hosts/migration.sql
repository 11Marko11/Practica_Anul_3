-- Taking the host role away used to only untie the account, leaving an empty host profile behind
-- ("no account"). The user is a plain customer again, so remove those leftover profiles.
DELETE FROM "Host" h
WHERE h."userId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Car" c WHERE c."hostId" = h."id");
