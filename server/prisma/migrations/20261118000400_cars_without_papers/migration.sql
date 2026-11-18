-- Every car still without papers gets the "no documents" state.
UPDATE "Car"
SET "condition" = 'NO_DOCUMENTS', "conditionNote" = NULL, "conditionSince" = COALESCE("conditionSince", NOW())
WHERE "reviewStatus" = 'NO_DOCUMENTS';
