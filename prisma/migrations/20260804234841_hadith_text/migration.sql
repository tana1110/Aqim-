-- Sahih al-Bukhari & Sahih Muslim (verified, vendored) for hadith-of-the-day.
CREATE TABLE "hadith_text" (
    "id" SERIAL NOT NULL,
    "collection" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "book" INTEGER,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "hadith_text_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hadith_text_collection_number_key" ON "hadith_text"("collection", "number");
