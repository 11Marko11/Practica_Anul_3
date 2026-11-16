-- A car saved without its papers: kept, but not shown and not yet sent to the admin.
ALTER TYPE "CarReviewStatus" ADD VALUE IF NOT EXISTS 'NO_DOCUMENTS' BEFORE 'PENDING';
