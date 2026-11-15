-- Sessions now end after 30 minutes without activity. Existing sessions were made to last
-- 30 days, so end them: everyone signs in once more under the new rule.
DELETE FROM "Session";
