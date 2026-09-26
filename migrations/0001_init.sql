-- CreateTable
CREATE TABLE "surah" (
    "number" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameArabic" TEXT NOT NULL,
    "nameEnglish" TEXT NOT NULL,
    "nameTranslit" TEXT NOT NULL,
    "revelationType" TEXT NOT NULL,
    "ayahCount" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "quran_text" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "surah_number" INTEGER NOT NULL,
    "ayah_number" INTEGER NOT NULL,
    "arabic_text" TEXT NOT NULL,
    "juz_number" INTEGER NOT NULL,
    "page_number" INTEGER NOT NULL,
    CONSTRAINT "quran_text_surah_number_fkey" FOREIGN KEY ("surah_number") REFERENCES "surah" ("number") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tafsir_text" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "surah_number" INTEGER NOT NULL,
    "ayah_number" INTEGER NOT NULL,
    "tafsir_source" TEXT NOT NULL,
    "source_url" TEXT,
    "summary_text" TEXT NOT NULL,
    "full_text" TEXT NOT NULL,
    CONSTRAINT "tafsir_text_surah_number_fkey" FOREIGN KEY ("surah_number") REFERENCES "surah" ("number") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meta" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "adhkar_text" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chapter_index" INTEGER NOT NULL,
    "chapter" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "reference" TEXT,
    "source" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "hadith_text" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "collection" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "book" INTEGER,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "memo_snapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "total_ayat" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "translation_text" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "surah_number" INTEGER NOT NULL,
    "ayah_number" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "translation_text_surah_number_fkey" FOREIGN KEY ("surah_number") REFERENCES "surah" ("number") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "password_hash" TEXT,
    "google_sub" TEXT,
    "streak_count" INTEGER NOT NULL DEFAULT 0,
    "streak_last_day" TEXT,
    "streak_shields" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "user_state" (
    "user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" TEXT NOT NULL DEFAULT '{}',
    "ts" BIGINT NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'ar',
    "lat" REAL,
    "lng" REAL,
    "method" TEXT NOT NULL DEFAULT 'umm_alqura',
    "prayers" BOOLEAN NOT NULL DEFAULT false,
    "wird_time" TEXT,
    "adhkar" BOOLEAN NOT NULL DEFAULT false,
    "tz_offset" INTEGER NOT NULL DEFAULT 0,
    "user_id" INTEGER,
    "last_sent" TEXT NOT NULL DEFAULT '{}',
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "memorization" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "surah_number" INTEGER NOT NULL,
    "from_ayah" INTEGER NOT NULL,
    "to_ayah" INTEGER NOT NULL,
    CONSTRAINT "memorization_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recitation_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "prayer_type" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "rakah_number" INTEGER NOT NULL,
    "surah_number" INTEGER NOT NULL,
    "from_ayah" INTEGER NOT NULL,
    "to_ayah" INTEGER NOT NULL,
    "used_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recitation_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings" (
    "user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "witr_rakahs" INTEGER NOT NULL DEFAULT 1,
    "no_repeat_window" INTEGER NOT NULL DEFAULT 5,
    "qiyam_repeat_window" INTEGER NOT NULL DEFAULT 7,
    "tafsir_source" TEXT NOT NULL DEFAULT 'ar.muyassar',
    "font" TEXT NOT NULL DEFAULT 'amiri-quran',
    "max_ayah_short" INTEGER NOT NULL DEFAULT 10,
    CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "quran_text_juz_number_idx" ON "quran_text"("juz_number");

-- CreateIndex
CREATE UNIQUE INDEX "quran_text_surah_number_ayah_number_key" ON "quran_text"("surah_number", "ayah_number");

-- CreateIndex
CREATE UNIQUE INDEX "tafsir_text_surah_number_ayah_number_tafsir_source_key" ON "tafsir_text"("surah_number", "ayah_number", "tafsir_source");

-- CreateIndex
CREATE INDEX "adhkar_text_chapter_index_idx" ON "adhkar_text"("chapter_index");

-- CreateIndex
CREATE UNIQUE INDEX "hadith_text_collection_number_key" ON "hadith_text"("collection", "number");

-- CreateIndex
CREATE INDEX "memo_snapshot_user_id_created_at_idx" ON "memo_snapshot"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "translation_text_surah_number_ayah_number_source_key" ON "translation_text"("surah_number", "ayah_number", "source");

-- CreateIndex
CREATE UNIQUE INDEX "users_uid_key" ON "users"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "memorization_user_id_idx" ON "memorization"("user_id");

-- CreateIndex
CREATE INDEX "recitation_history_user_id_used_at_idx" ON "recitation_history"("user_id", "used_at");

