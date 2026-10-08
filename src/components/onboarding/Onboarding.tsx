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

type Step = "intro" | "open" | "ex1" | "ex2" | "ex3" | "auth" | "greet";
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
  const [step, setStep] = useState<Step>("intro");
  const [motion, setMotion] = useState<"fwd" | "back" | "fade">("fwd");
  const [words, setWords] = useState<string[] | null>(null);
  const auth = useRef<"pending" | "none" | "signed">("pending");
  const replayRef = useRef(false);
  const [signedIn, setSignedIn] = useState(false);
  const [greetName, setGreetName] = useState("");
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const [exitToast, setExitToast] = useState(false);
  const stepRef = useRef<Step>("intro");
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
    try {
      replayRef.current = !!localStorage.getItem(REPLAY);
    } catch {}
    // Both load while the logo plays: whether this device is already signed
    // in (then the app opens straight after the logo), and the verse.
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        auth.current = d?.account ? "signed" : "none";
        if (d?.account) setSignedIn(true);
      })
      .catch(() => (auth.current = "none"));
    // Al-Isra 17:78 from the verified Quran text — never typed by hand.
    fetch("/api/slogan-ayah")
      .then((r) => r.json())
      .then((d: { arabic?: string | null }) => {
        if (!d.arabic) return;
        const list: string[] = [];
        for (const tok of cleanAyah(d.arabic).split(/\s+/)) {
          // A waqf mark travels with the word before it.
          if (!/\p{L}/u.test(tok) && list.length) list[list.length - 1] += " " + tok;
          else if (tok) list.push(tok);
        }
        setWords(list);
      })
      .catch(() => {});
  }, []);

  // After the logo: a signed-in device goes straight to the app (unless the
  // intro was replayed on purpose); everyone else continues to the verse.
  function afterIntro() {
    const decide = () => {
      if (auth.current === "signed" && !replayRef.current) finish();
      else go("open", "fade");
    };
    if (auth.current !== "pending") return decide();
    const started = Date.now();
    const id = setInterval(() => {
      if (auth.current !== "pending" || Date.now() - started > 1500) {
        clearInterval(id);
        decide();
      }
    }, 100);
  }

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

  function go(next: Step, dir: "fwd" | "back" | "fade" = "fwd") {
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
    if (!visible) return;
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
  }, [visible]);

  if (!visible) return null;

  const enter = motion === "fwd" ? "onb-fwd" : motion === "back" ? "onb-back" : "onb-fade";

  return (
    <div
      className={`onb-root fixed inset-0 z-40 bg-background text-foreground overflow-hidden ${
        lang === "en" ? "font-[family-name:var(--font-inter)]" : ""
      }`}
    >
      {(
        <div key={step} className={`absolute inset-0 ${step === "intro" ? "" : enter}`}>
          {step === "intro" && <Intro onDone={afterIntro} />}
          {step === "open" && (
            <Opening
              words={words}
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

// 1a · The brand moment, and the first-launch "loading" screen at once: the
// logo descends into sujood and the name appears; meanwhile the verse and
// the account check load. Moves on by itself (a tap moves on sooner).
function Intro({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  const next = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(next, reduce ? 900 : 2900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div onClick={next} className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <Frame />
      <LogoDescent className="w-[min(132px,22vh)] h-[min(132px,22vh)]" />
      <p
        className="onb-in mt-4 font-heading font-bold text-[min(3.25rem,8vh)] leading-[1.2]"
        style={{ animationDelay: "1.9s" }}
      >
        أقِم
      </p>
    </div>
  );
}

// 1b · Al-Isra 78 appears word by word, then the slogan, then the language
// choice. A tap anywhere shows the finished screen at once.
function Opening({
  words,
  instant,
  onPick,
}: {
  words: string[] | null;
  instant: boolean;
  onPick: (l: Lang) => void;
}) {
  const { t } = useLang();
  // Reduced motion shows the finished screen at once, so the buttons must work at once too.
  const [skipped, setSkipped] = useState(
    () => instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [buttonsLive, setButtonsLive] = useState(instant);
  const mountedAt = useRef(0);
  const wordsAt = useRef<number | null>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  // If the verse arrives after this screen opened, its reveal starts then.
  if (words && wordsAt.current === null && mountedAt.current) {
    wordsAt.current = (Date.now() - mountedAt.current) / 1000;
  }

  useEffect(() => {
    if (skipped) return;
    const id = setTimeout(() => setButtonsLive(true), 1700);
    return () => clearTimeout(id);
  }, [skipped]);

  // Until the buttons have appeared, a tap only finishes the animation.
  const pick = (l: Lang) => {
    if (buttonsLive || skipped) onPick(l);
  };
  const late = wordsAt.current ?? 0;

  return (
    <div
      onClick={() => setSkipped(true)}
      className={`absolute inset-0 flex flex-col ${skipped ? "onb-skip" : ""}`}
    >
      <Frame />
      <div className="relative flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center px-10 pt-[calc(var(--safe-top)+24px)]">
        {words && (
          <p
            dir="rtl"
            lang="ar"
            className="font-quran text-[min(1.5rem,3.5vh)] leading-[2.15] max-w-[310px] [text-wrap:balance]"
          >
            {words.map((w, i) => (
              <span key={i}>
                <span className="onb-word" style={{ animationDelay: `${Math.max(0, 0.15 + 0.06 * i - late)}s` }}>
                  {w}
                </span>
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        )}
        <div className="onb-in flex flex-col items-center" style={{ animationDelay: "1.1s" }}>
          <p className="mt-1.5 text-xs text-muted">{t("onb.ref")}</p>
          <div className="mt-[min(1.5rem,3vh)]">
            <Divider />
          </div>
          <p dir="rtl" lang="ar" className="mt-[min(1.25rem,2.5vh)] font-heading font-bold text-[min(1.75rem,4vh)] leading-normal text-accent">
            صلِّ بخشوع، لا بعادة
          </p>
          <p dir="ltr" lang="en" className="text-[0.8125rem] text-muted font-[family-name:var(--font-inter)]">
            Pray with humility, not a habit.
          </p>
        </div>
      </div>

      <div
        className="onb-in relative shrink-0 px-10 pt-5 pb-[calc(var(--safe-bottom)+min(52px,5vh))] flex flex-col items-center gap-3.5"
        style={{ animationDelay: "1.4s" }}
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
  const { t, lang } = useLang();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  // Google: native sign-in inside the Android app (Google blocks its web
  // button in WebViews), the web button everywhere else — same server
  // endpoint as the Account page.
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleRef = useRef<HTMLDivElement>(null);
  const [nativeGoogle, setNativeGoogle] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withGoogle(credential: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      clearPageCaches();
      if (d.isNewAccount) onSignedUp(d.name || "");
      else await onLoggedIn();
    } catch {
      setError(t("account.err.generic"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setNativeGoogle(!!window.AndroidApp?.googleSignIn);
    setInApp(!!window.AndroidApp);
  }, []);

  useEffect(() => {
    if (!nativeGoogle) return;
    window.__aqimGoogleCredential = (token: string) => void withGoogle(token);
    window.__aqimGoogleError = (code: string) => {
      setBusy(false);
      if (code !== "cancelled") setError(t("account.err.generic"));
    };
    return () => {
      delete window.__aqimGoogleCredential;
      delete window.__aqimGoogleError;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeGoogle]);

  useEffect(() => {
    if (!googleClientId || window.AndroidApp) return;
    const render = () => {
      const g = window.google?.accounts?.id;
      if (!g || !googleRef.current) return;
      g.initialize({
        client_id: googleClientId,
        callback: (resp: { credential: string }) => void withGoogle(resp.credential),
      });
      const theme = document.documentElement.getAttribute("data-theme");
      const dark =
        theme === "dark" ||
        (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      googleRef.current.innerHTML = "";
      g.renderButton(googleRef.current, {
        theme: dark ? "filled_black" : "outline",
        shape: "pill",
        size: "large",
        width: 320,
        text: "continue_with",
        locale: lang === "ar" ? "ar" : "en",
      });
    };
    if (window.google?.accounts?.id) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleClientId, lang, mode]);

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

          {(nativeGoogle || (!inApp && googleClientId)) && (
            <div className="mt-5 flex flex-col items-center gap-4">
              <div className="w-full flex items-center gap-3 text-xs text-muted" aria-hidden>
                <span className="flex-1 h-px bg-border" />
                {t("onb.or")}
                <span className="flex-1 h-px bg-border" />
              </div>
              {nativeGoogle ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    setError(null);
                    window.AndroidApp?.googleSignIn?.();
                  }}
                  className="w-full h-14 rounded-full bg-surface flex items-center justify-center gap-2.5 font-bold active:scale-[0.98] transition disabled:opacity-60"
                >
                  <GoogleMark />
                  {t("account.google")}
                </button>
              ) : (
                <div ref={googleRef} className="min-h-11 flex justify-center" />
              )}
            </div>
          )}
          {inApp && !nativeGoogle && (
            <p className="mt-4 text-center text-xs text-muted">{t("account.googleUpdate")}</p>
          )}

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

// Google's four-colour "G" for the native-app button (the web one is
// drawn by Google's own script).
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
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
