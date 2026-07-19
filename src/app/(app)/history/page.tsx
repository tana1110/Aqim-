"use client";

import { useEffect, useState } from "react";
import { Sparkles, Layers, BookMarked } from "lucide-react";
import type { SurahMeta } from "@/lib/types";

interface Stats {
  week: {
    totalRecitations: number;
    distinctPassages: number;
    distinctSurahs: number;
    bySurah: {
      surahNumber: number;
      count: number;
      nameEnglish: string;
      nameArabic: string;
    }[];
  };
  allTime: { totalRecitations: number; distinctPassages: number };
}

interface HistoryRow {
  id: number;
  prayerType: string;
  mode: string;
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  usedAt: string;
}

export default function HistoryPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [surahMap, setSurahMap] = useState<Map<number, SurahMeta>>(new Map());

  useEffect(() => {
    Promise.all([
      fetch("/api/history/stats").then((r) => r.json()),
      fetch("/api/history").then((r) => r.json()),
      fetch("/api/surahs").then((r) => r.json()),
    ]).then(([s, h, sur]) => {
      setStats(s);
      setRows(h.history ?? []);
      setSurahMap(
        new Map((sur.surahs ?? []).map((x: SurahMeta) => [x.number, x])),
      );
    });
  }, []);

  return (
    <div className="space-y-5 pt-2 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start lg:space-y-0">
      <div className="lg:col-span-2">
        <h1 className="text-xl font-bold mb-1">سجلّك</h1>
        <p className="text-sm text-muted">تابع تنوّعك في القراءة هذا الأسبوع.</p>
      </div>

      {stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2.5">
            <Stat
              Icon={Sparkles}
              label="تلاوات الأسبوع"
              value={stats.week.totalRecitations}
            />
            <Stat
              Icon={Layers}
              label="مقاطع مختلفة"
              value={stats.week.distinctPassages}
            />
            <Stat
              Icon={BookMarked}
              label="سور مختلفة"
              value={stats.week.distinctSurahs}
            />
          </div>

          {stats.week.bySurah.length > 0 && (
            <div className="card p-4">
              <div className="text-sm font-bold mb-3">الأكثر تكراراً</div>
              <div className="space-y-2.5">
                {stats.week.bySurah.map((b) => (
                  <div key={b.surahNumber} className="flex items-center gap-3">
                    <span className="font-quran text-base w-24 truncate">
                      {b.nameArabic}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{
                          width: `${
                            (b.count /
                              Math.max(1, stats.week.bySurah[0].count)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted w-5 text-left tabular-nums">
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="text-sm font-bold mb-2 px-1">آخر ما استُخدم</div>
        {rows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            لا يوجد سجل بعد — ابدأ بالقراءة.
          </div>
        ) : (
          <div className="card divide-y divide-border overflow-hidden">
            {rows.map((r) => {
              const s = surahMap.get(r.surahNumber);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3.5"
                >
                  <span className="font-quran text-base">
                    {s?.nameArabic ?? `سورة ${r.surahNumber}`}{" "}
                    <span className="text-xs text-muted">
                      ({r.fromAyah}–{r.toAyah})
                    </span>
                  </span>
                  <span className="text-xs text-muted">
                    {prayerLabel(r.prayerType)} ·{" "}
                    {new Date(r.usedAt).toLocaleDateString("ar")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: typeof Sparkles;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-3.5 text-center">
      <Icon size={18} className="text-primary mx-auto mb-1.5" />
      <div className="text-2xl font-bold text-foreground tabular-nums">
        {value}
      </div>
      <div className="text-[10px] text-muted mt-0.5 leading-tight">{label}</div>
    </div>
  );
}

function prayerLabel(key: string): string {
  const map: Record<string, string> = {
    fajr: "الفجر",
    dhuhr: "الظهر",
    asr: "العصر",
    maghrib: "المغرب",
    isha: "العشاء",
    witr: "الوتر",
    "fajr-sunnah": "سنة الفجر",
    "dhuhr-nafl": "سنن الظهر",
    "maghrib-sunnah": "سنة المغرب",
    "isha-shaf": "الشفع",
    free: "نافلة",
    qiyam: "قيام",
  };
  return map[key] ?? key;
}
