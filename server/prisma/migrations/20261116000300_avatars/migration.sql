-- Users can add a profile photo (an UploadedPhoto, public like car photos).
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
