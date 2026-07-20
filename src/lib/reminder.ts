// Prayer-time reminders — privacy-first.
// Times are computed ON-DEVICE with adhan-js from locally stored coordinates;
// no location data ever leaves the device.

import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import type { CalculationParameters } from "adhan";

export const METHOD_KEYS = [
  "umm_alqura",
  "mwl",
  "egyptian",
  "karachi",
  "dubai",
  "qatar",
  "kuwait",
  "turkey",
  "singapore",
  "north_america",
] as const;
export type MethodKey = (typeof METHOD_KEYS)[number];

const METHODS: Record<MethodKey, () => CalculationParameters> = {
  umm_alqura: CalculationMethod.UmmAlQura,
  mwl: CalculationMethod.MuslimWorldLeague,
  egyptian: CalculationMethod.Egyptian,
  karachi: CalculationMethod.Karachi,
  dubai: CalculationMethod.Dubai,
  qatar: CalculationMethod.Qatar,
  kuwait: CalculationMethod.Kuwait,
  turkey: CalculationMethod.Turkey,
  singapore: CalculationMethod.Singapore,
  north_america: CalculationMethod.NorthAmerica,
};

export interface DayTimes {
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export function computeTimes(
  lat: number,
  lng: number,
  method: MethodKey,
  date: Date = new Date(),
): DayTimes {
  const pt = new PrayerTimes(
    new Coordinates(lat, lng),
    date,
    (METHODS[method] ?? CalculationMethod.UmmAlQura)(),
  );
  return {
    fajr: pt.fajr,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

// Manual fallback: a curated city list (no geocoding service needed).
export const CITIES: {
  key: string;
  ar: string;
  en: string;
  lat: number;
  lng: number;
}[] = [
  { key: "mecca", ar: "مكة المكرمة", en: "Mecca", lat: 21.3891, lng: 39.8579 },
  { key: "medina", ar: "المدينة المنورة", en: "Medina", lat: 24.5247, lng: 39.5692 },
  { key: "riyadh", ar: "الرياض", en: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { key: "jeddah", ar: "جدة", en: "Jeddah", lat: 21.4858, lng: 39.1925 },
  { key: "khartoum", ar: "الخرطوم", en: "Khartoum", lat: 15.5007, lng: 32.5599 },
  { key: "cairo", ar: "القاهرة", en: "Cairo", lat: 30.0444, lng: 31.2357 },
  { key: "alexandria", ar: "الإسكندرية", en: "Alexandria", lat: 31.2001, lng: 29.9187 },
  { key: "amman", ar: "عمّان", en: "Amman", lat: 31.9454, lng: 35.9284 },
  { key: "damascus", ar: "دمشق", en: "Damascus", lat: 33.5138, lng: 36.2765 },
  { key: "baghdad", ar: "بغداد", en: "Baghdad", lat: 33.3152, lng: 44.3661 },
  { key: "kuwait", ar: "الكويت", en: "Kuwait City", lat: 29.3759, lng: 47.9774 },
  { key: "doha", ar: "الدوحة", en: "Doha", lat: 25.2854, lng: 51.531 },
  { key: "dubai", ar: "دبي", en: "Dubai", lat: 25.2048, lng: 55.2708 },
  { key: "abudhabi", ar: "أبوظبي", en: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
  { key: "muscat", ar: "مسقط", en: "Muscat", lat: 23.588, lng: 58.3829 },
  { key: "sanaa", ar: "صنعاء", en: "Sana'a", lat: 15.3694, lng: 44.191 },
  { key: "istanbul", ar: "إسطنبول", en: "Istanbul", lat: 41.0082, lng: 28.9784 },
  { key: "casablanca", ar: "الدار البيضاء", en: "Casablanca", lat: 33.5731, lng: -7.5898 },
  { key: "algiers", ar: "الجزائر", en: "Algiers", lat: 36.7538, lng: 3.0588 },
  { key: "tunis", ar: "تونس", en: "Tunis", lat: 36.8065, lng: 10.1815 },
  { key: "tripoli", ar: "طرابلس", en: "Tripoli", lat: 32.8872, lng: 13.1913 },
  { key: "london", ar: "لندن", en: "London", lat: 51.5074, lng: -0.1278 },
  { key: "paris", ar: "باريس", en: "Paris", lat: 48.8566, lng: 2.3522 },
  { key: "newyork", ar: "نيويورك", en: "New York", lat: 40.7128, lng: -74.006 },
  { key: "toronto", ar: "تورونتو", en: "Toronto", lat: 43.6532, lng: -79.3832 },
  { key: "kualalumpur", ar: "كوالالمبور", en: "Kuala Lumpur", lat: 3.139, lng: 101.6869 },
  { key: "jakarta", ar: "جاكرتا", en: "Jakarta", lat: -6.2088, lng: 106.8456 },
  { key: "karachi", ar: "كراتشي", en: "Karachi", lat: 24.8607, lng: 67.0011 },
];

// ---------------------------------------------------------------------------
// Local reminder config (stored ONLY on this device).
// ---------------------------------------------------------------------------

export interface ReminderConfig {
  enabled: boolean;
  method: MethodKey;
  lat: number | null;
  lng: number | null;
  locationLabel: string | null; // "auto" coords or a city name
}

const KEY = "aqim-reminder";

export function loadReminderConfig(): ReminderConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {}
  return defaultConfig();
}

export function saveReminderConfig(cfg: ReminderConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
    // Nudge the scheduler to re-plan.
    window.dispatchEvent(new Event("aqim-reminder-changed"));
  } catch {}
}

function defaultConfig(): ReminderConfig {
  return {
    enabled: false,
    method: "umm_alqura",
    lat: null,
    lng: null,
    locationLabel: null,
  };
}
