-- Hourglass streak (server-side), synced client state, push->user link,
-- and password-reset tokens.

ALTER TABLE "users" ADD COLUMN "streak_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "streak_expires_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "streak_last_day" TEXT;

ALTER TABLE "push_subscriptions" ADD COLUMN "user_id" INTEGER;

CREATE TABLE "user_state" (
    "user_id" INTEGER NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "ts" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_state_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_state_user_id_fkey" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
