-- Rukhsa shields: earned streak protection (one per 7-day streak, max 2).
-- A fully missed day consumes one automatically instead of breaking the streak.

ALTER TABLE "users" ADD COLUMN "streak_shields" INTEGER NOT NULL DEFAULT 0;
