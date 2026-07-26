// Recitation audio — verified reciter recordings served by the Islamic
// Network CDN. Audio is REAL recorded recitation; nothing is ever generated.

import type { SurahMeta } from "@/lib/types";

export interface Reciter {
  key: string;
  bitrate: number; // each edition is published at a specific bitrate
  ar: string;
  en: string;
}

// All verified reachable (HTTP 200) on cdn.islamic.network.
export const RECITERS: Reciter[] = [
  { key: "ar.alafasy", bitrate: 128, ar: "مشاري راشد العفاسي", en: "Mishary Rashid Alafasy" },
  { key: "ar.husary", bitrate: 128, ar: "محمود خليل الحصري", en: "Mahmoud Khalil Al-Husary" },
  { key: "ar.abdulbasitmurattal", bitrate: 192, ar: "عبد الباسط عبد الصمد", en: "Abdul Basit Abdus-Samad" },
  { key: "ar.abdurrahmaansudais", bitrate: 192, ar: "عبد الرحمن السديس", en: "Abdurrahman As-Sudais" },
  { key: "ar.mahermuaiqly", bitrate: 128, ar: "ماهر المعيقلي", en: "Maher Al-Muaiqly" },
  { key: "ar.minshawi", bitrate: 128, ar: "محمد صديق المنشاوي", en: "Mohammed Siddiq Al-Minshawi" },
  { key: "ar.saoodshuraym", bitrate: 64, ar: "سعود الشريم", en: "Saud Ash-Shuraym" },
  { key: "ar.hudhaify", bitrate: 128, ar: "علي الحذيفي", en: "Ali Al-Hudhaify" },
];

const RECITER_KEY = "aqim-reciter";

export function loadReciter(): Reciter {
  try {
    const k = localStorage.getItem(RECITER_KEY);
    const found = RECITERS.find((r) => r.key === k);
    if (found) return found;
  } catch {}
  return RECITERS[0];
}

export function saveReciter(key: string) {
  try {
    localStorage.setItem(RECITER_KEY, key);
  } catch {}
}

// Global (cumulative) ayah number across the whole Quran, 1-6236.
export function globalAyahNumber(
  surahs: SurahMeta[],
  surahNumber: number,
  ayahNumber: number,
): number | null {
  let offset = 0;
  for (const s of surahs) {
    if (s.number === surahNumber) return offset + ayahNumber;
    offset += s.ayahCount;
  }
  return null;
}

export function ayahAudioUrl(globalAyah: number, reciter: Reciter): string {
  return `https://cdn.islamic.network/quran/audio/${reciter.bitrate}/${reciter.key}/${globalAyah}.mp3`;
}

// Download a whole surah's recitation (for the chosen reciter) into the
// service-worker audio cache so it plays offline any time.
export async function downloadSurahAudio(
  surahs: SurahMeta[],
  surahNumber: number,
  reciter: Reciter,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const meta = surahs.find((s) => s.number === surahNumber);
  const start = globalAyahNumber(surahs, surahNumber, 1);
  if (!meta || start == null) return 0;
  const cache = await caches.open("aqim-audio-v1");
  let done = 0;
  for (let i = 0; i < meta.ayahCount; i += 5) {
    const batch: Promise<void>[] = [];
    for (let j = i; j < Math.min(i + 5, meta.ayahCount); j++) {
      const url = ayahAudioUrl(start + j, reciter);
      batch.push(
        cache.match(url).then(async (hit) => {
          if (!hit) {
            const res = await fetch(url);
            if (res.ok) await cache.put(url, res);
          }
          done++;
          onProgress?.(done, meta.ayahCount);
        }),
      );
    }
    await Promise.all(batch);
  }
  return done;
}

export async function isSurahAudioDownloaded(
  surahs: SurahMeta[],
  surahNumber: number,
  reciter: Reciter,
): Promise<boolean> {
  const meta = surahs.find((s) => s.number === surahNumber);
  const start = globalAyahNumber(surahs, surahNumber, 1);
  if (!meta || start == null) return false;
  const cache = await caches.open("aqim-audio-v1");
  const probes = [0, Math.floor(meta.ayahCount / 2), meta.ayahCount - 1];
  for (const p of probes) {
    if (!(await cache.match(ayahAudioUrl(start + p, reciter)))) return false;
  }
  return true;
}
