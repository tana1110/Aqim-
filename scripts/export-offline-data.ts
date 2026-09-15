// One-off export: dumps the verified reference tables (Quran text, tafsir,
// translation, surah metadata, adhkar, hadith) out of Postgres into static
// JSON under src/data/, so the client can read them with zero network and
// zero database dependency. Run with: npx tsx scripts/export-offline-data.ts
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

config({ path: join(__dirname, "..", ".env") });
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../src/lib/prisma");

const OUT_DIR = join(__dirname, "..", "src", "data");

function write(name: string, data: unknown) {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `${name}.json`);
  const json = JSON.stringify(data);
  writeFileSync(path, json);
  console.log(`${name}.json — ${(json.length / 1024).toFixed(1)} KB`);
}

async function main() {
  const surahs = await prisma.surah.findMany({ orderBy: { number: "asc" } });
  write("surahs", surahs);

  const quranText = await prisma.quranText.findMany({
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
  });
  write("quranText", quranText);

  const tafsirText = await prisma.tafsirText.findMany({
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
  });
  write("tafsirText", tafsirText);

  const translationText = await prisma.translationText.findMany({
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
  });
  write("translationText", translationText);

  const adhkarText = await prisma.adhkarText.findMany({
    orderBy: [{ chapterIndex: "asc" }, { position: "asc" }],
  });
  write("adhkarText", adhkarText);

  const hadithText = await prisma.hadithText.findMany();
  write("hadithText", hadithText);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
