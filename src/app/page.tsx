import { prisma } from "@/lib/prisma";
import { LandingClient } from "@/components/LandingClient";

// The slogan verse — Al-Isra (17:78). Text (Arabic) and English translation are
// read from the verified, locally-seeded source, never hand-typed.
async function getSloganAyah() {
  try {
    const [ayah, translation] = await Promise.all([
      prisma.quranText.findUnique({
        where: { surahNumber_ayahNumber: { surahNumber: 17, ayahNumber: 78 } },
      }),
      prisma.translationText.findFirst({
        where: { surahNumber: 17, ayahNumber: 78 },
      }),
    ]);
    return {
      arabic: ayah?.arabicText ?? null,
      translation: translation?.text ?? null,
    };
  } catch {
    return { arabic: null, translation: null };
  }
}

export default async function Landing() {
  const ayah = await getSloganAyah();
  return (
    <LandingClient ayahArabic={ayah.arabic} ayahTranslation={ayah.translation} />
  );
}
