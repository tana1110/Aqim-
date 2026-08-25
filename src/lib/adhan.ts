// The call to prayer (azan) — real recorded muezzins only, served by
// cdn.aladhan.com (the same Islamic Network project family that already
// provides this app's verified Quran recitation audio). Never synthesized.

export interface AdhanVoice {
  key: string;
  url: string;
  ar: string;
  en: string;
}

export const ADHAN_VOICES: AdhanVoice[] = [
  {
    key: "alafasy",
    url: "https://cdn.aladhan.com/audio/adhans/a9.mp3",
    ar: "مشاري راشد العفاسي",
    en: "Mishary Rashid Alafasy",
  },
  {
    key: "nafees",
    url: "https://cdn.aladhan.com/audio/adhans/a1.mp3",
    ar: "أحمد النفيس",
    en: "Ahmad al-Nafees",
  },
  {
    key: "turkish",
    url: "https://cdn.aladhan.com/audio/adhans/a2.mp3",
    ar: "الطراز التركي — حافظ مصطفى أوزجان",
    en: "Turkish style — Hafiz Mustafa Özcan",
  },
];

export interface AdhanPref {
  enabled: boolean;
  voice: string; // AdhanVoice.key
}

const KEY = "aqim-adhan";

export function loadAdhanPref(): AdhanPref {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AdhanPref>;
      return {
        enabled: !!parsed.enabled,
        voice: ADHAN_VOICES.some((v) => v.key === parsed.voice)
          ? (parsed.voice as string)
          : ADHAN_VOICES[0].key,
      };
    }
  } catch {}
  return { enabled: false, voice: ADHAN_VOICES[0].key };
}

export function saveAdhanPref(pref: AdhanPref) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pref));
    window.dispatchEvent(new Event("aqim-adhan-changed"));
  } catch {}
}

export function adhanVoiceUrl(voiceKey: string): string {
  return (ADHAN_VOICES.find((v) => v.key === voiceKey) ?? ADHAN_VOICES[0]).url;
}
