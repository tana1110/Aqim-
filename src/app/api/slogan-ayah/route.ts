import { prisma } from "@/lib/prisma";

// The app's signature verse — Al-Isra (17:78): "أقم الصلاة لدلوك الشمس…" —
// served from the verified local text (never hand-typed) for the Welcome page.
export async function GET() {
  try {
    const [ayah, translation] = await Promise.all([
      prisma.quranText.findUnique({
        where: { surahNumber_ayahNumber: { surahNumber: 17, ayahNumber: 78 } },
      }),
      prisma.translationText.findFirst({
        where: { surahNumber: 17, ayahNumber: 78 },
      }),
    ]);
    return Response.json({
      arabic: ayah?.arabicText ?? null,
      translation: translation?.text ?? null,
    });
  } catch {
    return Response.json({ arabic: null, translation: null });
  }
}
