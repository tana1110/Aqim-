-- CreateTable
CREATE TABLE "translation_text" (
    "id" SERIAL NOT NULL,
    "surah_number" INTEGER NOT NULL,
    "ayah_number" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "translation_text_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "translation_text_surah_number_ayah_number_source_key" ON "translation_text"("surah_number", "ayah_number", "source");

-- AddForeignKey
ALTER TABLE "translation_text" ADD CONSTRAINT "translation_text_surah_number_fkey" FOREIGN KEY ("surah_number") REFERENCES "surah"("number") ON DELETE RESTRICT ON UPDATE CASCADE;
