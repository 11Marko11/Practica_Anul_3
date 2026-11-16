-- Only cars whose registration certificate and RCA insurance were uploaded and approved stay on
-- the site. The others (e.g. the first cars, added before papers were asked for) wait for them.
UPDATE "Car" c SET "reviewStatus" = 'NO_DOCUMENTS', "reviewNote" = NULL, "reviewSubmittedAt" = NULL
WHERE c."status" <> 'REMOVED'
  AND (
    NOT EXISTS (SELECT 1 FROM "HostDocument" d WHERE d."carId" = c."id" AND d."type" = 'CAR_REGISTRATION')
    OR NOT EXISTS (SELECT 1 FROM "HostDocument" d WHERE d."carId" = c."id" AND d."type" = 'CAR_INSURANCE')
  );
