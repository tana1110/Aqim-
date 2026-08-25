"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, X } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

// Plays the real adhan recording at prayer time (dispatched as a window
// event by ReminderScheduler) with a visible stop control — a multi-minute
// recording should never force-play with no way to silence it.
export function AdhanPlayer() {
  const { t } = useLang();
  const [playing, setPlaying] = useState<{ url: string; label: string } | null>(
    null,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    function onPlay(e: Event) {
      const detail = (e as CustomEvent<{ url: string; label: string }>).detail;
      if (!detail?.url) return;
      audioRef.current?.pause();
      const audio = new Audio(detail.url);
      audioRef.current = audio;
      setPlaying(detail);
      audio.onended = () => setPlaying(null);
      audio.play().catch(() => setPlaying(null));
    }
    window.addEventListener("aqim-azan-play", onPlay);
    return () => {
      window.removeEventListener("aqim-azan-play", onPlay);
      audioRef.current?.pause();
    };
  }, []);

  function stop() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
  }

  if (!playing) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 md:bottom-6 z-50 max-w-sm mx-auto animate-rise">
      <div className="rounded-2xl bg-primary text-white shadow-lg px-4 py-3 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-white/15 grid place-items-center shrink-0">
          <Volume2 size={17} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold truncate">
            {t("adhan.playing")}
          </span>
          <span className="block text-[11px] text-white/70 truncate">
            {playing.label}
          </span>
        </span>
        <button
          onClick={stop}
          aria-label={t("adhan.stop")}
          className="w-9 h-9 rounded-full bg-white/15 grid place-items-center shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
