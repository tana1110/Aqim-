"use client";

import { useLang } from "@/components/LanguageProvider";

// Explainer illustrations — built from the app's own components (cards,
// chips, the round «أقِم» button), animated. Demo content shows surah names
// and ayah numbers only (never ayah text); everything is in Mushaf order.

export const ART_W = 350;

function useNum() {
  const { lang } = useLang();
  return (n: number) => (lang === "ar" ? n.toLocaleString("ar-EG") : String(n));
}

function Star({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <span
      className="relative grid place-items-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="absolute inset-0 text-accent"
        aria-hidden
      >
        <rect x="7.5" y="7.5" width="17" height="17" fill="none" stroke="currentColor" strokeOpacity="0.6" />
        <rect
          x="7.5"
          y="7.5"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.6"
          transform="rotate(45 16 16)"
        />
      </svg>
      <span className="relative text-[12px] font-extrabold text-accent">{children}</span>
    </span>
  );
}

function Tick({ size = 15, color = "#1c2830" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path
        d="M4 9.5l3.2 3.2L14 6"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 1 · «حدّد ما تحفظه» — the last three juz, checked one after another.
export const EX1_H = 290;
export function Ex1Art() {
  const { t, lang } = useLang();
  const num = useNum();
  const rows = [
    { juz: 28, name: t("onb.ex1.juz28"), count: t("onb.ex1.count28"), delay: 0 },
    { juz: 29, name: t("onb.ex1.juz29"), count: t("onb.ex1.count29"), delay: 0.45 },
    { juz: 30, name: t("onb.ex1.juz30"), count: t("onb.ex1.count30"), delay: 0.9 },
  ];
  return (
    <div className="h-full grid place-items-center">
      <div className="w-full rounded-[28px] bg-surface px-5 py-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
        {rows.map((r, i) => (
          <div
            key={r.juz}
            className={`onb-e1-row flex items-center gap-3.5 h-[84px] ${
              i < rows.length - 1 ? "border-b border-border/70" : ""
            }`}
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <Star size={38}>{num(r.juz)}</Star>
            <span className="flex-1 flex flex-col">
              <span className={`${lang === "ar" ? "font-heading text-[21px]" : "text-[17px]"} font-bold leading-[1.4]`}>
                {r.name}
              </span>
              <span className="text-[12px] text-muted">{r.count}</span>
            </span>
            <span
              className="onb-e1-box w-[26px] h-[26px] rounded-[8px] border-[1.5px] grid place-items-center"
              style={{ animationDelay: `${r.delay}s` }}
            >
              <span className="onb-e1-tick grid" style={{ animationDelay: `${r.delay}s` }}>
                <Tick />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DIGITS_ONES = ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0"];
const DIGITS_TENS = ["5", "4", "3", "2", "1", "0"];

// A countdown whose seconds really tick (the app's «المتبقي» pill).
export function Countdown({ prefix }: { prefix: string }) {
  return (
    <span dir="ltr" className="flex tabular-nums leading-[1.3]">
      {prefix}
      <span className="inline-block h-[1.3em] overflow-hidden">
        <span className="onb-d-tens">
          {DIGITS_TENS.map((d) => (
            <span key={d} className="block">
              {d}
            </span>
          ))}
        </span>
      </span>
      <span className="inline-block h-[1.3em] overflow-hidden">
        <span className="onb-d-ones">
          {DIGITS_ONES.map((d) => (
            <span key={d} className="block">
              {d}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

// 2 · the app's real home card → tap «أقِم» → ayat for each rak'ah, from
// two different juz of what was memorized, each with its short meaning.
export const EX2_H = 430;
export function Ex2Art() {
  const { t } = useLang();
  const num = useNum();
  const chips = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const results = [
    { n: 1, label: t("onb.ex2.r1"), cls: "onb-x-res1", line: "onb-x-l1", widths: [100, 94, 62], meaning: 80 },
    { n: 2, label: t("onb.ex2.r2"), cls: "onb-x-res2", line: "onb-x-l2", widths: [100, 90, 70], meaning: 74 },
  ];
  return (
    <div className="relative h-full">
      <div className="onb-x-hero absolute inset-x-0 top-[78px] rounded-[28px] bg-primary-soft p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-muted">{t("home.nextPrayer")}</div>
            <div className="text-[30px] font-extrabold leading-[1.35] text-primary">
              {t("prayer.dhuhr")}
            </div>
          </div>
          <div className="rounded-2xl bg-surface px-3.5 py-2 text-end shadow-sm">
            <div className="text-[10px] text-muted">{t("home.remaining")}</div>
            <div className="text-[18px] font-bold text-primary">
              <Countdown prefix="00:24:" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-muted mb-2">{t("home.pickPrayer")}</div>
          <div className="flex gap-[7px]">
            {chips.map((c) => (
              <span
                key={c}
                className={`w-[54px] h-[54px] rounded-full grid place-items-center text-[12px] font-bold shadow-sm ${
                  c === "dhuhr" ? "bg-primary text-white scale-105" : "bg-surface"
                }`}
              >
                {t(`prayer.${c}`)}
              </span>
            ))}
          </div>
        </div>
        <div className="relative h-[58px]">
          <span className="onb-x-halo absolute inset-0 rounded-full border-2 border-accent" />
          <div className="onb-x-btn absolute inset-0 rounded-full bg-accent grid place-items-center overflow-hidden text-[25px] font-extrabold text-[#1c2830]">
            أقِم
            <span className="onb-x-rip absolute left-1/2 top-1/2 w-10 h-10 rounded-full bg-white" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 flex flex-col gap-3">
        <p className="onb-x-res0 mx-1 text-[13px] font-bold text-muted">{t("onb.ex2.results")}</p>
        {results.map((r) => (
          <div
            key={r.n}
            className={`${r.cls} rounded-[24px] bg-surface p-[18px] shadow-[0_14px_34px_rgba(0,0,0,0.2)]`}
          >
            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-accent-soft text-accent px-[11px] py-[3px] text-[12px] font-extrabold">
                {t("onb.ex2.rakah", { n: num(r.n) })}
              </span>
              <span className="text-[14px] font-semibold">{r.label}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {r.widths.map((w, i) => (
                <span
                  key={i}
                  className={`${r.line} block h-[9px] rounded-full`}
                  style={{ width: `${w}%`, background: "var(--onb-skel)", animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <div className="mt-3.5 mb-2 border-t border-dashed border-border" />
            <p className="mb-[7px] text-[11px] font-bold text-secondary">{t("onb.ex2.meaning")}</p>
            <span
              className={`${r.line} block h-[7px] rounded-full`}
              style={{ width: `${r.meaning}%`, background: "var(--onb-meaning)", animationDelay: "0.3s" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// 3 · everything else, one feature at a time.
export const EX3_H = 436;
export function Ex3Art() {
  const { t, lang } = useLang();
  const num = useNum();
  return (
    <div className="flex flex-col gap-3">
      <div className="onb-sp1 h-[112px] rounded-[26px] bg-surface p-[18px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-extrabold">{t("wird.title")}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" className="text-accent" aria-hidden>
            <path
              d="M2 5h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z M22 5h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="flex gap-[5px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`onb-wd onb-wd${i} w-3 h-3 rounded-full`} />
            ))}
            <span className="w-3 h-3 rounded-full bg-border" />
            <span className="w-3 h-3 rounded-full bg-border" />
          </div>
          <span className="flex-1 h-1.5 rounded-full bg-border overflow-hidden flex">
            <span className="onb-w-bar w-[64%] h-full rounded-full bg-accent" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="onb-sp2 h-[150px] rounded-[26px] bg-secondary-soft p-4 flex flex-col justify-between">
          <span className="text-[12px] font-bold text-secondary">{t("adhkar.morning")}</span>
          <span className="self-center h-10 overflow-hidden block rounded-full bg-background/40 px-4">
            <span className="onb-a-strip block">
              {[3, 2, 1].map((n) => (
                <span key={n} className="grid place-items-center h-10 text-[20px] font-extrabold text-secondary">
                  ×{num(n)}
                </span>
              ))}
              <span className="grid place-items-center h-10">
                <Tick size={22} color="var(--color-secondary)" />
              </span>
            </span>
          </span>
          <span className="text-[16px] font-extrabold">{t("onb.ex3.adhkar")}</span>
        </div>

        <div className="onb-sp3 h-[150px] rounded-[26px] bg-accent-soft p-4 flex flex-col justify-between">
          <span className={`${lang === "ar" ? "font-heading" : "font-semibold"} text-[15px] text-accent`}>
            {t("onb.ex3.subhan")}
          </span>
          <span className="relative self-center w-[60px] h-11 grid place-items-center">
            <span className="onb-m-tap absolute left-1/2 top-1/2 -ml-7 -mt-7 w-14 h-14 rounded-full border-2 border-accent" />
            <span className="h-11 overflow-hidden block">
              <span className="onb-m-strip block">
                {[31, 32, 33].map((n) => (
                  <span key={n} className="grid place-items-center h-11 text-[32px] font-extrabold text-accent">
                    {num(n)}
                  </span>
                ))}
              </span>
            </span>
          </span>
          <span className="text-[16px] font-extrabold">{t("tasbih.title")}</span>
        </div>

        <div className="onb-sp4 h-[150px] rounded-[26px] bg-primary-soft p-4 flex flex-col justify-between">
          <span className="relative self-center w-[84px] h-[84px]">
            <svg width="84" height="84" viewBox="0 0 84 84" className="absolute inset-0" aria-hidden>
              <circle cx="42" cy="42" r="38" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
              <path d="M42 8v6M42 70v6M8 42h6M70 42h6" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <svg width="84" height="84" viewBox="0 0 84 84" className="onb-q-kaaba absolute inset-0" aria-hidden>
              <rect x="36" y="15" width="12" height="12" rx="1.5" fill="#0f171c" stroke="var(--color-accent)" strokeWidth="1" />
              <path d="M36 19.5h12" stroke="var(--color-accent)" strokeWidth="1.6" />
            </svg>
            <svg width="84" height="84" viewBox="0 0 84 84" className="onb-q-needle absolute inset-0" aria-hidden>
              <path d="M42 30 L46 42 L42 40 L38 42 Z" fill="var(--color-accent)" />
              <path d="M42 54 L46 42 L42 44 L38 42 Z" fill="var(--color-muted)" />
              <circle cx="42" cy="42" r="2.5" fill="var(--color-foreground)" />
            </svg>
          </span>
          <span className="text-[16px] font-extrabold">{t("onb.ex3.qibla")}</span>
        </div>

        <div className="onb-sp5 h-[150px] rounded-[26px] bg-surface p-4 flex flex-col justify-between">
          <span className="onb-r-pin self-start inline-flex items-center gap-1.5 rounded-full bg-secondary-soft text-secondary px-2.5 py-1 text-[12px] font-extrabold">
            <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            {t("onb.ex3.mulk")}
          </span>
          <p className="onb-r-text m-0 text-[13px] leading-[1.6] text-muted whitespace-pre-line">
            {t("onb.ex3.focus")}
          </p>
          <span className="text-[16px] font-extrabold">{t("onb.ex3.review")}</span>
        </div>
      </div>
    </div>
  );
}
