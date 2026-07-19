"use client";

import Link from "next/link";
import { useLayoutEffect, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Repeat,
  ShieldCheck,
  Lock,
  BookOpenText,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { MosqueIcon, NafilahIcon, QiyamIcon } from "@/components/ModeIcons";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/components/LanguageProvider";
import { cleanAyah } from "@/lib/quranDisplay";

export function LandingClient({
  ayahArabic,
  ayahTranslation,
}: {
  ayahArabic: string | null;
  ayahTranslation: string | null;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  // The marketing landing is for BROWSER visitors. When running as the
  // installed app (standalone), go straight into the app — this also rescues
  // phones whose installed icon still carries an old cached start_url of "/".
  useLayoutEffect(() => {
    try {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standalone) router.replace("/home");
    } catch {}
  }, [router]);

  return (
    <div className="min-h-dvh overflow-x-hidden">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-background/95 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-3 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Logo variant={2} size={32} />
            <span className="hidden sm:inline text-[11px] tracking-widest text-muted mt-1">
              AQIM
            </span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 md:px-8 pt-12 md:pt-16 pb-12 text-center">
        <Logo variant={2} size={72} className="mx-auto mb-8" />

        {ayahArabic && (
          <>
            <p
              className="font-quran text-lg md:text-2xl text-muted leading-[2.1] max-w-2xl mx-auto"
              dir="rtl"
            >
              {cleanAyah(ayahArabic)}
            </p>
            {lang === "en" && ayahTranslation && (
              <p className="text-sm text-muted/80 italic max-w-xl mx-auto mt-3">
                “{ayahTranslation}”
              </p>
            )}
          </>
        )}

        <h1 className="font-heading text-[2rem] leading-[1.35] md:text-5xl md:leading-[1.3] font-bold text-primary mt-8">
          {t("landing.slogan")}
        </h1>

        <p className="text-[15px] md:text-lg text-muted leading-relaxed mt-4 mx-auto max-w-xl">
          {t("landing.description")}
        </p>

        <div className="mt-8 px-2">
          <Link
            href="/home"
            className="btn-cta flex w-full sm:w-auto sm:inline-flex items-center justify-center gap-2.5 px-12 py-4 text-xl"
          >
            {t("common.startNow")}
            <Arrow size={22} />
          </Link>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-14">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">
          {t("landing.why")}
        </h2>
        <div className="grid gap-3.5 md:grid-cols-3 md:items-stretch">
          <Feature
            Icon={Lock}
            title={t("landing.why1.title")}
            body={t("landing.why1.body")}
          />
          <Feature
            Icon={ShieldCheck}
            title={t("landing.why2.title")}
            body={t("landing.why2.body")}
          />
          <Feature
            Icon={Repeat}
            title={t("landing.why3.title")}
            body={t("landing.why3.body")}
          />
        </div>
      </section>

      {/* Modes */}
      <section className="mx-auto max-w-2xl px-4 md:px-8 py-4">
        <h2 className="text-lg md:text-xl font-bold mb-4 text-center">
          {t("landing.covers")}
        </h2>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          <ModeChip
            Icon={MosqueIcon}
            label={t("mode.faraid")}
            hint={t("mode.faraid.hint")}
          />
          <ModeChip
            Icon={NafilahIcon}
            label={t("mode.nafl")}
            hint={t("mode.nafl.hint")}
          />
          <ModeChip
            Icon={QiyamIcon}
            label={t("mode.qiyam")}
            hint={t("mode.qiyam.hint")}
          />
        </div>
      </section>

      {/* How */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-10 md:py-14">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">
          {t("landing.how")}
        </h2>
        <div className="mx-auto max-w-md md:max-w-none grid gap-6 md:grid-cols-3">
          <Step n={1} title={t("landing.step1.title")} body={t("landing.step1.body")} />
          <Step n={2} title={t("landing.step2.title")} body={t("landing.step2.body")} />
          <Step n={3} title={t("landing.step3.title")} body={t("landing.step3.body")} />
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-4xl px-4 md:px-8 py-4">
        <div className="card p-5 md:p-6 flex items-start sm:items-center gap-4 bg-accent-soft/60 border-accent/25">
          <BookOpenText size={24} className="text-accent shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
            {t("landing.trust")}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 md:px-8 pt-8 pb-16 text-center">
        <div className="card overflow-hidden">
          <div className="px-6 py-10 md:p-12 bg-primary-soft">
            <h2 className="font-heading text-[1.6rem] leading-snug md:text-3xl text-foreground mb-3">
              {t("landing.cta.title")}
            </h2>
            <p className="text-sm md:text-base text-muted leading-relaxed max-w-md mx-auto">
              {t("landing.cta.body")}
            </p>
            <div className="mt-6 px-2">
              <Link
                href="/home"
                className="btn-cta flex w-full sm:w-auto sm:inline-flex items-center justify-center gap-2.5 px-12 py-4 text-lg"
              >
                {t("common.startNow")}
                <Arrow size={20} />
              </Link>
            </div>
          </div>
        </div>
        <p className="text-[11px] md:text-xs text-muted mt-6 leading-relaxed">
          {t("landing.fiqhNote")}
        </p>
      </section>
    </div>
  );
}

function Feature({
  Icon,
  title,
  body,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-4 md:p-5 flex gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary-soft grid place-items-center shrink-0">
        <Icon size={20} className="text-primary" />
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-[15px] mb-1">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function ModeChip({
  Icon,
  label,
  hint,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <div className="card p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 text-center">
      <Icon size={26} className="text-primary" />
      <span className="text-[13px] sm:text-sm font-bold leading-tight">
        {label}
      </span>
      <span className="text-[10px] text-muted">{hint}</span>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-9 h-9 rounded-lg btn-primary grid place-items-center text-base shrink-0">
        {n}
      </div>
      <div className="pt-1 min-w-0">
        <h3 className="font-bold text-[15px]">{title}</h3>
        <p className="text-sm text-muted leading-relaxed mt-0.5">{body}</p>
      </div>
    </div>
  );
}
