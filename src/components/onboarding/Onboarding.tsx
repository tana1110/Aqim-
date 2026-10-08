"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { Logo } from "@/components/Logo";
import { clearPageCaches } from "@/lib/cache";
import { cleanAyah } from "@/lib/quranDisplay";
import type { Lang } from "@/lib/i18n";
import { LogoDescent } from "./LogoDescent";
import { FitBox } from "./FitBox";
import { ART_W, Ex1Art, EX1_H, Ex2Art, EX2_H, Ex3Art, EX3_H } from "./Explainers";

// First-launch journey (before any account): opening + language → three
// explainers → sign up (optional) → a one-time greeting. Setup (memorization
// + ayah length) continues on /setup in onboarding mode. Shown once per
// device; a device that is already signed in skips straight to the app.

const FLAG = "aqim-onboarded";
const REPLAY = "aqim-onb-replay";
export const ONBOARDING_SETUP = "/setup?onboarding=1";

type Step = "open" | "ex1" | "ex2" | "ex3" | "auth" | "greet";
const PREV: Partial<Record<Step, Step>> = {
  ex1: "open",
  ex2: "ex1",
  ex3: "ex2",
  auth: "ex3",
};

export function Onboarding() {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("open");
  const [motion, setMotion] = useState<"fwd" | "back">("fwd");
  const [signedIn, setSignedIn] = useState(false);
  const [greetName, setGreetName] = useState("");
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const [exitToast, setExitToast] = useState(false);
  const stepRef = useRef<Step>("open");
  const armedAt = useRef(0);

  useLayoutEffect(() => {
    let done = false;
    try {
      done = !!localStorage.getItem(FLAG);
    } catch {}
    if (done) {
      document.documentElement.removeAttribute("data-welcome");
      return;
    }
    setVisible(true);
    let replay = false;
    try {
      replay = !!localStorage.getItem(REPLAY);
    } catch {}
    // A reinstall / new device that's already signed in goes straight home
    // (unless the intro was replayed on purpose from Settings). Wait briefly
    // for the answer so the opening never starts and then vanishes.
    let settled = false;
    const show = () => {
      if (settled) return;
      settled = true;
      setReady(true);
    };
    const timer = setTimeout(show, 800);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.account) return show();
        setSignedIn(true);
        if (replay || settled) return show();
        settled = true;
        clearTimeout(timer);
        finish();
      })
      .catch(show);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hide() {
    document.documentElement.removeAttribute("data-welcome");
    setVisible(false);
  }

  function finish(dest?: string) {
    try {
      localStorage.setItem(FLAG, "1");
      // The new journey replaces the old spotlight tour.
      localStorage.setItem("aqim-tour-done", "1");
      localStorage.removeItem(REPLAY);
    } catch {}
    window.dispatchEvent(new Event("aqim-onboarded"));
    if (!dest || dest.split("?")[0] === window.location.pathname) {
      hide();
      return;
    }
    // Keep covering the screen until the destination has rendered.
    setLeavingTo(dest.split("?")[0]);
    router.push(dest);
    setTimeout(hide, 3000);
  }

  useEffect(() => {
    if (leavingTo && pathname === leavingTo) {
      const id = setTimeout(hide, 250);
      return () => clearTimeout(id);
    }
  }, [pathname, leavingTo]);

  function go(next: Step, dir: "fwd" | "back" = "fwd") {
    stepRef.current = next;
    setMotion(dir);
    setStep(next);
  }

  function afterExplainers() {
    if (signedIn) finish();
    else go("auth");
  }

  // Hardware back: explainers step back; on the opening, the app-wide
  // "press back again to exit" rule applies.
  useEffect(() => {
    if (!visible || !ready) return;
    // Carry Next's own history state: on a popstate into an entry it didn't
    // create, the App Router does a full reload (blank screen mid-journey).
    const push = () =>
      window.history.pushState({ ...window.history.state, aqimOnb: true }, "", "#onb");
    push();
    const onPop = () => {
      push();
      const prev = PREV[stepRef.current];
      if (prev) {
        go(prev, "back");
        return;
      }
      const now = Date.now();
      if (now - armedAt.current < 2000) {
        if (window.AndroidApp?.exitApp) window.AndroidApp.exitApp();
        else window.history.go(-2);
        return;
      }
      armedAt.current = now;
      setExitToast(true);
      setTimeout(() => setExitToast(false), 2000);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [visible, ready]);

  if (!visible) return null;

  const enter = motion === "fwd" ? "onb-fwd" : "onb-back";

  return (
    <div
      className={`onb-root fixed inset-0 z-40 bg-background text-foreground overflow-hidden ${
        lang === "en" ? "font-[family-name:var(--font-inter)]" : ""
      }`}
    >
      {ready && (
        <div key={step} className={`absolute inset-0 ${step === "open" ? "" : enter}`}>
          {step === "open" && (
            <Opening
              instant={motion === "back"}
              onPick={(l) => {
                setLang(l);
                go("ex1");
              }}
            />
          )}
          {step === "ex1" && (
            <Explainer
              index={0}
              title={t("onb.ex1.title")}
              artH={EX1_H}
              art={<Ex1Art />}
              onNext={() => go("ex2")}
              onSkip={afterExplainers}
            />
          )}
          {step === "ex2" && (
            <Explainer
              index={1}
              title={t("onb.ex2.title")}
              artH={EX2_H}
              art={<Ex2Art />}
              onNext={() => go("ex3")}
              onSkip={afterExplainers}
            />
          )}
          {step === "ex3" && (
            <Explainer
              index={2}
              title={t("onb.ex3.title")}
              artH={EX3_H}
              art={<Ex3Art />}
              onNext={afterExplainers}
              onSkip={afterExplainers}
            />
          )}
          {step === "auth" && (
            <AuthScreen
              onBack={() => go("ex3", "back")}
              onLater={() => finish(ONBOARDING_SETUP)}
              onForgot={() => finish("/account")}
              onSignedUp={(name) => {
                setGreetName(name);
                go("greet");
              }}
              onLoggedIn={async () => {
                // An existing account skips the greeting and setup — unless it
                // never finished choosing its memorization.
                let has = true;
                try {
                  const s = await fetch("/api/status").then((r) => r.json());
                  has = !!s.hasMemorization;
                } catch {}
                finish(has ? "/home" : ONBOARDING_SETUP);
              }}
            />
          )}
          {step === "greet" && (
            <Greeting name={greetName} onDone={() => finish(ONBOARDING_SETUP)} />
          )}
        </div>
      )}

      {exitToast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center pointer-events-none">
          <span className="rounded-full bg-primary text-white px-5 py-2.5 text-sm font-bold shadow-lg animate-rise">
            {t("app.backToExit")}
          </span>
        </div>
      )}
    </div>
  );
}

// A thin double gold rule with an eight-point star top and bottom — kept to
// the two ceremonial screens (opening, greeting).
function Frame() {
  const star = (
    <svg width="18" height="18" viewBox="0 0 18 18" className="text-accent" aria-hidden>
      <rect x="4" y="4" width="10" height="10" fill="none" stroke="currentColor" />
      <rect x="4" y="4" width="10" height="10" fill="none" stroke="currentColor" transform="rotate(45 9 9)" />
    </svg>
  );
  return (
    <div
      className="pointer-events-none absolute inset-x-3.5"
      style={{ top: "calc(var(--safe-top) + 4px)", bottom: "calc(var(--safe-bottom) + 14px)" }}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-[28px] border border-accent/25" />
      <div className="absolute inset-[5px] rounded-[23px] border border-accent/10" />
      <span className="onb-frame-star absolute left-1/2 -top-[9px] -translate-x-1/2 px-2 flex">{star}</span>
      <span className="onb-frame-star absolute left-1/2 -bottom-[9px] -translate-x-1/2 px-2 flex">{star}</span>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span className="w-[34px] h-px bg-accent/60" />
      <span className="w-1.5 h-1.5 bg-accent rotate-45" />
      <span className="w-[34px] h-px bg-accent/60" />
    </div>
  );
}

// 1 · Opening + language. Logo descends (0–2.3s), wordmark, then Al-Isra 78
// appears word by word, then the slogan, then the language choice. A tap
// anywhere jumps to the finished screen.
function Opening({ instant, onPick }: { instant: boolean; onPick: (l: Lang) => void }) {
  const { t } = useLang();
  // Reduced motion shows the finished screen at once, so the buttons must work at once too.
  const [skipped, setSkipped] = useState(
    () => instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [buttonsLive, setButtonsLive] = useState(instant);
  const [ayah, setAyah] = useState<{ words: string[]; at: number } | null>(null);
  const start = useRef(0);

  useEffect(() => {
    start.current = Date.now();
    // Al-Isra 17:78 from the verified Quran text — never typed by hand.
    fetch("/api/slogan-ayah")
      .then((r) => r.json())
      .then((d: { arabic?: string | null }) => {
        if (!d.arabic) return;
        const words: string[] = [];
        for (const tok of cleanAyah(d.arabic).split(/\s+/)) {
          // A waqf mark travels with the word before it.
          if (!/\p{L}/u.test(tok) && words.length) words[words.length - 1] += " " + tok;
          else if (tok) words.push(tok);
        }
        setAyah({ words, at: (Date.now() - start.current) / 1000 });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (skipped) return;
    const id = setTimeout(() => setButtonsLive(true), 5100);
    return () => clearTimeout(id);
  }, [skipped]);

  // Until the buttons have appeared, a tap only finishes the animation.
  const pick = (l: Lang) => {
    if (buttonsLive || skipped) onPick(l);
  };

  return (
    <div
      onClick={() => setSkipped(true)}
      className={`absolute inset-0 flex flex-col ${skipped ? "onb-skip" : ""}`}
    >
      <Frame />
      <div className="relative flex-1 min-h-0 overflow-y-auto flex flex-col items-center text-center px-10 pt-[calc(var(--safe-top)+min(52px,3vh))]">
        <LogoDescent className="onb-open-logo shrink-0" />
        <p className="onb-in mt-3 font-heading font-bold text-[min(2.75rem,7vh)] leading-[1.2]" style={{ animationDelay: "2.2s" }}>
          أقِم
        </p>
        {ayah && (
          <p
            dir="rtl"
            lang="ar"
            className="mt-[min(1.75rem,3vh)] font-quran text-[min(1.375rem,3.3vh)] leading-[2.15] max-w-[300px] [text-wrap:balance]"
          >
            {ayah.words.map((w, i) => (
              <span key={i}>
                <span
                  className="onb-word"
                  style={{ animationDelay: `${Math.max(0, 2.6 + 0.1 * i - ayah.at)}s` }}
                >
                  {w}
                </span>
                {i < ayah.words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        )}
        <div className="onb-in onb-open-gap flex flex-col items-center gap-1" style={{ animationDelay: "4.5s" }}>
          <p className="mt-1.5 text-xs text-muted">{t("onb.ref")}</p>
          <div className="mt-5">
            <Divider />
          </div>
          <p dir="rtl" lang="ar" className="mt-4 font-heading font-bold text-[min(1.5625rem,3.8vh)] leading-normal text-accent">
            صلِّ بخشوع، لا بعادة
          </p>
          <p dir="ltr" lang="en" className="text-[0.8125rem] text-muted font-[family-name:var(--font-inter)]">
            Pray with humility, not a habit.
          </p>
        </div>
      </div>

      <div
        className="onb-in relative shrink-0 px-10 pt-5 pb-[calc(var(--safe-bottom)+min(52px,5vh))] flex flex-col items-center gap-3.5"
        style={{ animationDelay: "4.9s" }}
      >
        <p className="text-xs text-muted flex items-center gap-2">
          <span lang="ar">اختر اللغة</span>
          <span aria-hidden>·</span>
          <span dir="ltr" lang="en" className="font-[family-name:var(--font-inter)]">
            Choose language
          </span>
        </p>
        <div className="w-full max-w-sm grid grid-cols-2 gap-2.5">
          <button
            type="button"
            dir="rtl"
            lang="ar"
            onClick={() => pick("ar")}
            className="h-14 rounded-full bg-primary-soft text-foreground font-extrabold text-[1.0625rem] active:scale-[0.98] transition"
          >
            العربية
          </button>
          <button
            type="button"
            dir="ltr"
            lang="en"
            onClick={() => pick("en")}
            className="h-14 rounded-full bg-primary-soft text-foreground font-semibold text-base font-[family-name:var(--font-inter)] active:scale-[0.98] transition"
          >
            English
          </button>
        </div>
      </div>
    </div>
  );
}

// 2–4 · Explainer layout: dots + skip, illustration, title, next.
function Explainer({
  index,
  title,
  art,
  artH,
  onNext,
  onSkip,
}: {
  index: number;
  title: string;
  art: React.ReactNode;
  artH: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="absolute inset-0 flex flex-col pt-[calc(var(--safe-top)+12px)] pb-[calc(var(--safe-bottom)+28px)]">
      <div className="shrink-0 flex items-center justify-between ps-6 pe-4 h-12">
        <div className="flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-[22px] bg-accent" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
        <button type="button" onClick={onSkip} className="min-h-11 px-2 text-sm text-muted hover:text-foreground">
          {t("onb.skip")}
        </button>
      </div>

      <FitBox w={ART_W} h={artH} className="flex-1 mx-5 my-4">
        {art}
      </FitBox>

      {/* Capped on short screens so a big font setting never squeezes the illustration away. */}
      <h1 className="shrink-0 px-7 text-[min(1.75rem,4.4vh)] font-extrabold leading-normal min-h-[3em] whitespace-pre-line">
        {title}
      </h1>

      <div className="shrink-0 px-6 pt-5">
        <button
          type="button"
          onClick={onNext}
          className="onb-btn-gold w-full max-w-md mx-auto h-14 text-[1.0625rem] flex items-center justify-center gap-2"
        >
          {t("onb.next")}
          <ChevronLeft size={18} className="ltr:rotate-180" />
        </button>
      </div>
    </div>
  );
}

// 5 · Sign up (username + email + password) or log in; «لاحقًا» continues
// without an account. Same server logic as the Account page.
function AuthScreen({
  onBack,
  onLater,
  onForgot,
  onSignedUp,
  onLoggedIn,
}: {
  onBack: () => void;
  onLater: () => void;
  onForgot: () => void;
  onSignedUp: (name: string) => void;
  onLoggedIn: () => Promise<void>;
}) {
  const { t } = useLang();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { username: username.trim(), email, password } : { email, password },
        ),
      });
      const d = await r.json();
      if (!r.ok) {
        const key = `account.err.${d.error}`;
        const msg = t(key);
        setError(msg === key ? t("account.err.generic") : msg);
        return;
      }
      clearPageCaches(); // the visible data belongs to the account now
      if (mode === "signup") onSignedUp(d.name || username.trim());
      else await onLoggedIn();
    } catch {
      setError(t("account.err.generic"));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full h-14 rounded-[18px] bg-surface px-[18px] text-base text-foreground outline-none focus:ring-2 focus:ring-accent transition";

  return (
    <div className="absolute inset-0 flex flex-col pt-[calc(var(--safe-top)+12px)]">
      <div className="shrink-0 flex items-center justify-between px-3.5 h-12">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("onb.back")}
          className="w-11 h-11 rounded-full grid place-items-center text-muted"
        >
          <ChevronRight size={22} className="ltr:rotate-180" />
        </button>
        <button type="button" onClick={onLater} className="min-h-11 px-2 text-sm text-muted hover:text-foreground">
          {t("onb.later")}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-[calc(var(--safe-bottom)+32px)]">
        <div className="max-w-md mx-auto pt-6">
          <span className="w-16 h-16 rounded-full bg-surface grid place-items-center">
            <Logo variant="icon" size={40} />
          </span>
          <h1 className="mt-5 text-[1.875rem] font-extrabold leading-snug">
            {mode === "signup" ? t("onb.signup.title") : t("onb.login")}
          </h1>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-[18px]">
            {mode === "signup" && (
              <label className="flex flex-col gap-2">
                <span className="text-[0.8125rem] font-bold text-muted">{t("onb.username")}</span>
                <input
                  type="text"
                  required
                  maxLength={30}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={field}
                />
              </label>
            )}
            <label className="flex flex-col gap-2">
              <span className="text-[0.8125rem] font-bold text-muted">{t("account.email")}</span>
              <input
                type="email"
                required
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[0.8125rem] font-bold text-muted">{t("account.password")}</span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  dir="ltr"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${field} pr-[54px]`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t(showPassword ? "account.hidePassword" : "account.showPassword")}
                  className="absolute right-1.5 top-1.5 w-11 h-11 grid place-items-center text-muted"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </span>
            </label>

            {mode === "login" && (
              <button type="button" onClick={onForgot} className="self-start text-xs text-muted underline decoration-dotted">
                {t("account.forgot")}
              </button>
            )}

            {error && (
              <p role="alert" className="text-sm text-accent bg-accent-soft rounded-xl p-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="onb-btn-gold mt-3 h-14 text-[1.0625rem]">
              {mode === "signup" ? t("onb.signup.btn") : t("onb.login.btn")}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            {mode === "signup" ? t("onb.haveAccount") : t("onb.noAccount")}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
              }}
              className="font-extrabold text-accent"
            >
              {mode === "signup" ? t("onb.login") : t("onb.createOne")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// 6 · One-time greeting after a new sign-up; continues by itself (or on tap).
function Greeting({ name, onDone }: { name: string; onDone: () => void }) {
  const { t } = useLang();
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  useEffect(() => {
    const id = setTimeout(finish, 4800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div onClick={finish} className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
      <Frame />
      <LogoDescent fast className="w-24 h-24" />
      <div className="onb-in mt-8 flex flex-col items-center gap-1.5" style={{ animationDelay: "1.3s" }}>
        <h1 className="font-heading font-bold text-[2.25rem] leading-snug">{t("onb.salam")}</h1>
        {name && <p className="text-[1.375rem] font-extrabold">{name}</p>}
      </div>
      <div className="onb-in mt-7 flex flex-col items-center gap-5" style={{ animationDelay: "1.6s" }}>
        <Divider />
        <p dir="rtl" lang="ar" className="font-heading font-bold text-[2.875rem] leading-snug text-accent">
          فتح الله عليكم
        </p>
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2 w-24 h-0.5 rounded-full bg-border overflow-hidden"
        style={{ bottom: "calc(var(--safe-bottom) + 72px)" }}
        aria-hidden
      >
        <div className="onb-grow w-full h-full bg-accent" />
      </div>
    </div>
  );
}
