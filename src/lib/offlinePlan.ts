// Offline mirror of src/lib/plan.ts's buildSuggestion — same prayer-plan
// shape, but resolved entirely on-device via offlineSelection + offlineData
// instead of Prisma. Settings that would normally come from the server
// Settings table use the same defaults getSettings() falls back to; only
// the passage-length preference (already localStorage-only, aqim-passage-len)
// varies per device today.
import {
  DHUHR_NAFL,
  FAJR_SUNNAH,
  MAGHRIB_SUNNAH,
  SHAF_NAFL,
  getFaraidPlan,
  getWitrPlan,
  naflPlan,
  type Mode,
  type PrayerPlan,
  type RakahSlot,
} from "@/lib/prayers";
import { getPassageContentOffline, getSurahsOffline } from "@/lib/offlineData";
import { selectPassagesOffline } from "@/lib/offlineSelection";
import type { FocusSpec, LengthPref, Passage } from "@/lib/passage";
import type { ResolvedPlan, ResolvedSlot, SuggestionRequest } from "@/lib/plan";

const DEFAULT_SETTINGS = {
  witrRakahs: 1,
  noRepeatWindow: 5,
  qiyamRepeatWindow: 7,
  tafsirSource: "ar.muyassar",
  maxAyahShort: 10,
};

function basePlan(req: SuggestionRequest, witrRakahs: number): PrayerPlan {
  if (req.mode === "faraid") {
    if (req.prayer === "witr") return getWitrPlan(witrRakahs);
    const p = (req.prayer ?? "fajr") as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
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

export async function buildSuggestionOffline(
  req: SuggestionRequest,
): Promise<ResolvedPlan> {
  const settings = DEFAULT_SETTINGS;
  const plan = basePlan(req, settings.witrRakahs);

  const suggestSlots = plan.slots.filter((s: RakahSlot) => s.kind === "suggest");
  const selection = await selectPassagesOffline(
    req.mode as Mode,
    suggestSlots.length,
    settings,
    (req.exclude as Passage[] | undefined) ?? [],
    (req.focus as FocusSpec | undefined | null) ?? null,
    (req.lengthPref as LengthPref | undefined) ?? "medium",
  );

  let selIdx = 0;
  const slots: ResolvedSlot[] = [];
  for (const slot of plan.slots) {
    if (slot.kind === "fatiha-only") {
      slots.push({ rakah: slot.rakah, kind: slot.kind, content: null });
    } else if (slot.kind === "fixed" && slot.fixedSurah) {
      const surahs = await getSurahsOffline();
      const surah = surahs.find((s) => s.number === slot.fixedSurah);
      const passage: Passage = {
        surahNumber: slot.fixedSurah,
        fromAyah: 1,
        toAyah: surah?.ayahCount ?? 1,
      };
      slots.push({
        rakah: slot.rakah,
        kind: "fixed",
        label: slot.label,
        content: await getPassageContentOffline(passage, settings.tafsirSource),
      });
    } else {
      const passage = selection.passages[selIdx++];
      slots.push({
        rakah: slot.rakah,
        kind: "suggest",
        content: passage
          ? await getPassageContentOffline(passage, settings.tafsirSource)
          : null,
      });
    }
  }

  return {
    title: plan.nameEnglish,
    titleArabic: plan.nameArabic,
    mode: req.mode as Mode,
    note: plan.note,
    slots,
    relaxed: selection.relaxed,
    exhausted: selection.exhausted,
  };
}
