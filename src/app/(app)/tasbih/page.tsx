"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import {
  TASBIH_CHIPS,
  TASBIH_SEQUENCE,
  effectiveTarget,
  loadTasbih,
  nextPhrase,
  resetTasbih,
  saveTasbih,
  startSequence,
  tapTasbih,
  type TasbihState,
} from "@/lib/tasbih";

const TARGETS = [33, 100, 0]; // 0 = free counting

export default function TasbihPage() {
  const { t, lang } = useLang();
  const [s, setS] = useState<TasbihState | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let st = loadTasbih();
    // From the after-prayer adhkar: start the one-after-another order.
    try {
      if (new URLSearchParams(window.location.search).get("sequence") === "1") {
        st = startSequence(st);
        window.history.replaceState(window.history.state, "", "/tasbih");
      }
    } catch {}
    setS(st);
    setCustomOpen(!st.sequence && !TASBIH_SEQUENCE.includes(st.phrase));
  }, []);

  if (!s) return null;

  const digits = (n: number) =>
    lang === "ar"
      ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
      : String(n);

  function apply(next: TasbihState) {
    setS(next);
    saveTasbih(next);
  }

  function tap() {
    const { next, cycled } = tapTasbih(s!);
    setS(next);
    try {
      navigator.vibrate?.(cycled ? [40, 60, 40] : 12);
    } catch {}
    if (cycled) {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }
  }

  // Progress ring
  const R = 88;
  const C = 2 * Math.PI * R;
  const target = effectiveTarget(s);
  const frac = target > 0 ? s.count / target : 0;

  return (
    <div className="pt-2 max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-bold text-center">{t("tasbih.title")}</h1>

      {/* One dhikr, or one after another (moves on by itself) */}
      <div className="flex gap-1 p-1 rounded-full bg-surface-2">
        {([false, true] as const).map((seq) => (
          <button
            key={String(seq)}
            onClick={() => {
              if (seq === s.sequence) return;
              setCustomOpen(false);
              apply(
                seq
                  ? { ...s, sequence: true, phrase: TASBIH_SEQUENCE.includes(s.phrase) ? s.phrase : TASBIH_SEQUENCE[0], target: s.target || 33, count: 0, rounds: 0 }
                  : { ...s, sequence: false, count: 0, rounds: 0 },
              );
            }}
            aria-pressed={s.sequence === seq}
            className={`flex-1 h-10 rounded-full text-sm font-bold transition ${
              s.sequence === seq ? "bg-primary text-white" : "text-muted"
            }`}
          >
            {seq ? t("tasbih.mode.sequence") : t("tasbih.mode.single")}
          </button>
        ))}
      </div>

      {/* Phrase picker */}
      <div>
        <div className="text-xs font-bold text-muted mb-2 px-1">
          {t("tasbih.pick")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TASBIH_CHIPS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setCustomOpen(false);
                apply({ ...s, phrase: p, count: 0, rounds: 0 });
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-quran transition ${
                s.phrase === p && !customOpen
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-foreground hover:border-primary/40"
              }`}
              dir="rtl"
            >
              {p}
            </button>
          ))}
          {!s.sequence && (
          <button
            onClick={() => setCustomOpen(true)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              customOpen
                ? "bg-primary text-white"
                : "bg-surface border border-border text-muted hover:border-primary/40"
            }`}
          >
            {t("tasbih.custom")}
          </button>
          )}
        </div>
        {customOpen && (
          <input
            type="text"
            value={TASBIH_SEQUENCE.includes(s.phrase) ? "" : s.phrase}
            onChange={(e) =>
              apply({ ...s, phrase: e.target.value, count: 0, rounds: 0 })
            }
            placeholder={t("tasbih.custom")}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-quran"
            dir="rtl"
          />
        )}
      </div>

      {/* Target */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-muted">{t("tasbih.target")}</span>
        <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-bold">
          {TARGETS.filter((v) => !s.sequence || v > 0).map((v) => (
            <button
              key={v}
              onClick={() => apply({ ...s, target: v, count: 0, rounds: 0 })}
              aria-pressed={target === v}
              className={`px-3 py-1 rounded-md transition-colors tabular-nums ${
                target === v
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {v === 0 ? t("tasbih.free") : digits(v)}
            </button>
          ))}
        </div>
      </div>

      {/* The bead: one huge tap target */}
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="flex flex-col items-center gap-1">
          <p
            key={s.phrase}
            className={`font-quran ${s.phrase.length > 40 ? "text-xl leading-loose" : "text-2xl"} text-primary text-center animate-rise max-w-sm`}
            dir="rtl"
          >
            {s.phrase}
          </p>
          {s.sequence && (
            <p className="text-xs text-muted">
              {t("tasbih.next")}{" "}
              <span className="font-quran text-sm" dir="rtl">
                {nextPhrase(s.phrase)}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={tap}
          aria-label={t("tasbih.tap")}
          className={`relative w-56 h-56 rounded-full grid place-items-center select-none active:scale-[0.96] transition ${
            pulse ? "animate-pulse" : ""
          }`}
        >
          <svg
            width={224}
            height={224}
            viewBox="0 0 224 224"
            className="absolute inset-0 -rotate-90"
          >
            <circle
              cx={112}
              cy={112}
              r={R}
              fill="var(--color-surface)"
              stroke="var(--color-border)"
              strokeWidth={10}
            />
            {target > 0 && (
              <circle
                cx={112}
                cy={112}
                r={R}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - frac)}
                className="transition-all duration-300"
              />
            )}
          </svg>
          <span className="relative text-center">
            <span className="block text-5xl font-bold tabular-nums text-primary">
              {digits(s.count)}
            </span>
            {target > 0 && (
              <span className="block text-sm text-muted tabular-nums mt-1">
                / {digits(target)}
              </span>
            )}
          </span>
        </button>
        <p className="text-[11px] text-muted">{t("tasbih.tap")}</p>
      </div>

      {/* Rounds + lifetime total + reset */}
      <div className="card p-4 flex items-center justify-between text-center">
        <div className="flex-1">
          <div className="text-lg font-bold tabular-nums text-primary">
            {digits(s.rounds)}
          </div>
          <div className="text-[10px] text-muted">{t("tasbih.rounds")}</div>
        </div>
        <div className="flex-1 border-x border-border">
          <div className="text-lg font-bold tabular-nums text-primary">
            {digits(s.total)}
          </div>
          <div className="text-[10px] text-muted">{t("tasbih.total")}</div>
        </div>
        <div className="flex-1">
          <button
            onClick={() => setS(resetTasbih(s))}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground"
          >
            <RotateCcw size={13} />
            {t("tasbih.reset")}
          </button>
        </div>
      </div>
    </div>
  );
}
