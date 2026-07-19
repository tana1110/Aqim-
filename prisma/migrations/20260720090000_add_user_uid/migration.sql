-- Add anonymous per-device identity to users. Existing rows (the old shared
-- single user) get a 'legacy-' uid no cookie will ever match, so every device
-- now starts with its own fresh dashboard.
ALTER TABLE "users" ADD COLUMN "uid" TEXT;
UPDATE "users" SET "uid" = 'legacy-' || "id" WHERE "uid" IS NULL;
ALTER TABLE "users" ALTER COLUMN "uid" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_uid_key" ON "users"("uid");
