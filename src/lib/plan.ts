import { prisma } from "@/lib/prisma";
import { getPassageContent, type PassageContent } from "@/lib/content";
import {
  selectPassages,
  type FocusSpec,
  type Passage,
} from "@/lib/selection";
import {
  DHUHR_NAFL,
  FAJR_SUNNAH,
  MAGHRIB_SUNNAH,
  SHAF_NAFL,
  getFaraidPlan,
  getWitrPlan,
  naflPlan,
  type FaraidPrayer,
  type Mode,
  type PrayerPlan,
  type RakahSlot,
} from "@/lib/prayers";

export interface ResolvedSlot {
  rakah: number;
  kind: RakahSlot["kind"];
  label?: string;
  content: PassageContent | null; // null for fatiha-only slots
}

export interface ResolvedPlan {
  title: string;
  titleArabic: string;
  mode: Mode;
  note?: string;
  slots: ResolvedSlot[];
  relaxed: boolean; // anti-repeat window was relaxed
  exhausted: boolean; // not enough memorized material for all suggest slots
}

export interface SuggestionRequest {
  mode: Mode;
  // faraid: fajr|dhuhr|asr|maghrib|isha|witr
  // nafl:  fajr-sunnah|maghrib-sunnah|free
  // qiyam: (prayer ignored)
  prayer?: string;
  rakahs?: number; // for nafl "free" and qiyam
  // passages the caller already committed to elsewhere (kept distinct)
  exclude?: Passage[];
  // Temporary review spotlight (focus mode) — never edits memorization.
  focus?: FocusSpec | null;
}

async function getSettings(userId: number) {
  const s = await prisma.settings.findUnique({ where: { userId } });
  return {
    witrRakahs: s?.witrRakahs ?? 1,
    noRepeatWindow: s?.noRepeatWindow ?? 5,
    qiyamRepeatWindow: s?.qiyamRepeatWindow ?? 7,
    tafsirSource: s?.tafsirSource ?? "ar.muyassar",
    maxAyahShort: s?.maxAyahShort ?? 10,
  };
}

function basePlan(req: SuggestionRequest, witrRakahs: number): PrayerPlan {
  if (req.mode === "faraid") {
    // Witr moved to Nawafil; keep faraid to the five obligatory prayers.
    if (req.prayer === "witr") return getWitrPlan(witrRakahs);
    const p = (req.prayer ?? "fajr") as FaraidPrayer;
    return getFaraidPlan(p);
  }
  if (req.mode === "nafl") {
    if (req.prayer === "fajr-sunnah") return FAJR_SUNNAH;
    if (req.prayer === "dhuhr-nafl") return DHUHR_NAFL;
    if (req.prayer === "maghrib-sunnah") return MAGHRIB_SUNNAH;
    if (req.prayer === "isha-shaf") return SHAF_NAFL;
    if (req.prayer === "witr") return getWitrPlan(witrRakahs);
    return naflPlan(Math.max(1, req.rakahs ?? 2));
  }
  // qiyam
  return {
    key: "qiyam",
    nameEnglish: "Qiyam al-Layl",
    nameArabic: "قيام الليل",
    slots: Array.from({ length: Math.max(1, req.rakahs ?? 2) }, (_, i) => ({
      rakah: i + 1,
      kind: "suggest" as const,
    })),
    note: "Longer passages are allowed. Anti-repetition uses a wider window.",
  };
}

// Build a full, ready-to-recite plan for a prayer + mode.
export async function buildSuggestion(
  userId: number,
  req: SuggestionRequest,
): Promise<ResolvedPlan> {
  const settings = await getSettings(userId);
  const plan = basePlan(req, settings.witrRakahs);

  const suggestSlots = plan.slots.filter((s) => s.kind === "suggest");
  const selection = await selectPassages(
    userId,
    req.mode,
    suggestSlots.length,
    settings,
    req.exclude ?? [],
    req.focus ?? null,
  );

  // Map each suggest slot to one selected passage (in order).
  let selIdx = 0;
  const slots: ResolvedSlot[] = [];
  for (const slot of plan.slots) {
    if (slot.kind === "fatiha-only") {
      slots.push({ rakah: slot.rakah, kind: slot.kind, content: null });
    } else if (slot.kind === "fixed" && slot.fixedSurah) {
      const surah = await prisma.surah.findUnique({
        where: { number: slot.fixedSurah },
      });
      const passage: Passage = {
        surahNumber: slot.fixedSurah,
        fromAyah: 1,
        toAyah: surah?.ayahCount ?? 1,
      };
      slots.push({
        rakah: slot.rakah,
        kind: "fixed",
        label: slot.label,
        content: await getPassageContent(passage, settings.tafsirSource),
      });
    } else {
      // suggest
      const passage = selection.passages[selIdx++];
      slots.push({
        rakah: slot.rakah,
        kind: "suggest",
        content: passage
          ? await getPassageContent(passage, settings.tafsirSource)
          : null,
      });
    }
  }

  return {
    title: plan.nameEnglish,
    titleArabic: plan.nameArabic,
    mode: req.mode,
    note: plan.note,
    slots,
    relaxed: selection.relaxed,
    exhausted: selection.exhausted,
  };
}
