-- CreateTable
CREATE TABLE "adhkar_text" (
    "id" SERIAL NOT NULL,
    "chapter_index" INTEGER NOT NULL,
    "chapter" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "reference" TEXT,
    "source" TEXT NOT NULL,

    CONSTRAINT "adhkar_text_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memo_snapshot" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_ayat" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memo_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adhkar_text_chapter_index_idx" ON "adhkar_text"("chapter_index");

-- CreateIndex
CREATE INDEX "memo_snapshot_user_id_created_at_idx" ON "memo_snapshot"("user_id", "created_at");
