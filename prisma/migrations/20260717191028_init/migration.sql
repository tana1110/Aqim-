-- CreateTable
CREATE TABLE "surah" (
    "number" INTEGER NOT NULL,
    "nameArabic" TEXT NOT NULL,
    "nameEnglish" TEXT NOT NULL,
    "nameTranslit" TEXT NOT NULL,
    "revelationType" TEXT NOT NULL,
    "ayahCount" INTEGER NOT NULL,

    CONSTRAINT "surah_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "quran_text" (
    "id" SERIAL NOT NULL,
    "surah_number" INTEGER NOT NULL,
    "ayah_number" INTEGER NOT NULL,
    "arabic_text" TEXT NOT NULL,
    "juz_number" INTEGER NOT NULL,
    "page_number" INTEGER NOT NULL,

    CONSTRAINT "quran_text_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tafsir_text" (
    "id" SERIAL NOT NULL,
    "surah_number" INTEGER NOT NULL,
    "ayah_number" INTEGER NOT NULL,
    "tafsir_source" TEXT NOT NULL,
    "source_url" TEXT,
    "summary_text" TEXT NOT NULL,
    "full_text" TEXT NOT NULL,

    CONSTRAINT "tafsir_text_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorization" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "surah_number" INTEGER NOT NULL,
    "from_ayah" INTEGER NOT NULL,
    "to_ayah" INTEGER NOT NULL,

    CONSTRAINT "memorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recitation_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "prayer_type" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "rakah_number" INTEGER NOT NULL,
    "surah_number" INTEGER NOT NULL,
    "from_ayah" INTEGER NOT NULL,
    "to_ayah" INTEGER NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recitation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "user_id" INTEGER NOT NULL,
    "witr_rakahs" INTEGER NOT NULL DEFAULT 1,
    "no_repeat_window" INTEGER NOT NULL DEFAULT 5,
    "qiyam_repeat_window" INTEGER NOT NULL DEFAULT 7,
    "tafsir_source" TEXT NOT NULL DEFAULT 'ar.muyassar',
    "font" TEXT NOT NULL DEFAULT 'amiri-quran',
    "max_ayah_short" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "quran_text_juz_number_idx" ON "quran_text"("juz_number");

-- CreateIndex
CREATE UNIQUE INDEX "quran_text_surah_number_ayah_number_key" ON "quran_text"("surah_number", "ayah_number");

-- CreateIndex
CREATE UNIQUE INDEX "tafsir_text_surah_number_ayah_number_tafsir_source_key" ON "tafsir_text"("surah_number", "ayah_number", "tafsir_source");

-- CreateIndex
CREATE INDEX "memorization_user_id_idx" ON "memorization"("user_id");

-- CreateIndex
CREATE INDEX "recitation_history_user_id_used_at_idx" ON "recitation_history"("user_id", "used_at");

-- AddForeignKey
ALTER TABLE "quran_text" ADD CONSTRAINT "quran_text_surah_number_fkey" FOREIGN KEY ("surah_number") REFERENCES "surah"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tafsir_text" ADD CONSTRAINT "tafsir_text_surah_number_fkey" FOREIGN KEY ("surah_number") REFERENCES "surah"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorization" ADD CONSTRAINT "memorization_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recitation_history" ADD CONSTRAINT "recitation_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
