// Recitation audio — verified reciter files served by the Islamic Network
// CDN (Mishary Rashid Alafasy, murattal 128kbps). Audio is REAL recorded
// recitation; nothing is ever generated.

import type { SurahMeta } from "@/lib/types";

export const RECITER = "ar.alafasy";
const CDN = "https://cdn.islamic.network/quran/audio/128";

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

export function ayahAudioUrl(globalAyah: number): string {
  return `${CDN}/${RECITER}/${globalAyah}.mp3`;
}

// Download a whole surah's recitation into the service-worker audio cache
// so it plays offline any time. Returns the number of files fetched.
export async function downloadSurahAudio(
  surahs: SurahMeta[],
  surahNumber: number,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const meta = surahs.find((s) => s.number === surahNumber);
  const start = globalAyahNumber(surahs, surahNumber, 1);
  if (!meta || start == null) return 0;
  const cache = await caches.open("aqim-audio-v1");
  let done = 0;
  // Small batches — kind to the CDN and to phone connections.
  for (let i = 0; i < meta.ayahCount; i += 5) {
    const batch: Promise<void>[] = [];
    for (let j = i; j < Math.min(i + 5, meta.ayahCount); j++) {
      const url = ayahAudioUrl(start + j);
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
): Promise<boolean> {
  const meta = surahs.find((s) => s.number === surahNumber);
  const start = globalAyahNumber(surahs, surahNumber, 1);
  if (!meta || start == null) return false;
  const cache = await caches.open("aqim-audio-v1");
  // Sampling first/middle/last keeps the check fast.
  const probes = [0, Math.floor(meta.ayahCount / 2), meta.ayahCount - 1];
  for (const p of probes) {
    if (!(await cache.match(ayahAudioUrl(start + p)))) return false;
  }
  return true;
}
