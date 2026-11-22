-- When each user last used the site while signed in, for the admin's "active" filter.
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
