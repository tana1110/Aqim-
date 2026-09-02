"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, LogOut, Eye, EyeOff } from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { useLang } from "@/components/LanguageProvider";
import { clearPageCaches } from "@/lib/cache";

// Optional account — the app works fully without one; signing in only makes
// the user's history/memorization follow them across devices.

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

export default function AccountPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [account, setAccount] = useState<{
    email: string | null;
    name: string | null;
  } | null>(null);
  const [dash, setDash] = useState<{
    fullSurahs: number;
    fullJuz: number;
    totalAyat: number;
    streak: number;
    reviews: number;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // "forgot" collects the email; a ?reset= link switches to "reset".
  const [flow, setFlow] = useState<"auth" | "forgot" | "reset">("auth");
  const [resetToken, setResetToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Onboarding hands off here with ?next= — after signing in (or choosing to
  // continue without an account) the journey resumes there.
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tok = params.get("reset");
      if (tok) {
        setResetToken(tok);
        setFlow("reset");
      }
      const nx = params.get("next");
      if (nx && nx.startsWith("/")) setNext(nx);
    } catch {}
  }, []);

  async function doRequestReset(targetEmail: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (r.status === 501) {
        setNotice(t("account.resetUnavailable"));
        return;
      }
      setNotice(t("account.resetSent"));
    } catch {
      setError(t("account.err.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    await doRequestReset(email);
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        const key = `account.err.${d.error}`;
        const msg = t(key);
        setError(msg === key ? t("account.err.generic") : msg);
        return;
      }
      clearPageCaches();
      router.refresh();
      await refreshAccount();
      setFlow("auth");
      setNotice(t("account.resetDone"));
    } catch {
      setError(t("account.err.generic"));
    } finally {
      setBusy(false);
    }
  }
  const googleRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  function refreshAccount() {
    return fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setAccount(d.account));
  }

  useEffect(() => {
    refreshAccount().finally(() => setLoaded(true));
  }, []);

  // Dashboard stats — same merged-coverage math as the History page, plus
  // streak and total-reviews, so a signed-in user sees their whole journey.
  useEffect(() => {
    if (!account) {
      setDash(null);
      return;
    }
    Promise.all([
      fetch("/api/memorization").then((r) => r.json()),
      fetch("/api/surahs").then((r) => r.json()),
      fetch("/api/juz").then((r) => r.json()),
      fetch(`/api/streak?tz=${-new Date().getTimezoneOffset()}`).then((r) =>
        r.json(),
      ),
      fetch("/api/history/stats").then((r) => r.json()),
    ])
      .then(([m, sur, j, streak, stats]) => {
        const memo: { surahNumber: number; fromAyah: number; toAyah: number }[] =
          m.memorization ?? [];
        const surahMap = new Map(
          (sur.surahs ?? []).map((x: { number: number; ayahCount: number }) => [
            x.number,
            x,
          ]),
        );
        const bySurah = new Map<number, [number, number][]>();
        for (const r of memo) {
          const l = bySurah.get(r.surahNumber) ?? [];
          l.push([r.fromAyah, r.toAyah]);
          bySurah.set(r.surahNumber, l);
        }
        let totalAyat = 0;
        let fullSurahs = 0;
        const merged = new Map<number, [number, number][]>();
        for (const [n, list] of bySurah) {
          list.sort((a, b) => a[0] - b[0]);
          const out: [number, number][] = [];
          for (const iv of list) {
            const last = out[out.length - 1];
            if (last && iv[0] <= last[1] + 1) last[1] = Math.max(last[1], iv[1]);
            else out.push([...iv]);
          }
          merged.set(n, out);
          for (const [a, b] of out) totalAyat += b - a + 1;
          const count = (surahMap.get(n) as { ayahCount?: number } | undefined)
            ?.ayahCount;
          if (count && out.length === 1 && out[0][0] === 1 && out[0][1] >= count)
            fullSurahs++;
        }
        const covered = (n: number, a: number, b: number) =>
          (merged.get(n) ?? []).some(([x, y]) => x <= a && b <= y);
        let fullJuz = 0;
        for (const jz of j.juz ?? []) {
          if (
            jz.segments.length > 0 &&
            jz.segments.every((seg: { surahNumber: number; fromAyah: number; toAyah: number }) =>
              covered(seg.surahNumber, seg.fromAyah, seg.toAyah),
            )
          )
            fullJuz++;
        }
        setDash({
          fullSurahs,
          fullJuz,
          totalAyat,
          streak: streak.count ?? 0,
          reviews: stats.allTime?.totalRecitations ?? 0,
        });
      })
      .catch(() => setDash(null));
  }, [account]);

  // Google Identity Services button (only when configured + signed out).
  useEffect(() => {
    if (!googleClientId || account || !loaded) return;
    const render = () => {
      const g = window.google?.accounts?.id;
      if (!g || !googleRef.current) return;
      g.initialize({
        client_id: googleClientId,
        callback: async (resp: { credential: string }) => {
          setBusy(true);
          setError(null);
          try {
            const r = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: resp.credential }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            clearPageCaches(); // the visible data belongs to the account now
            router.refresh();
            await refreshAccount();
            if (next) router.push(next);
          } catch {
            setError(t("account.err.generic"));
          } finally {
            setBusy(false);
          }
        },
      });
      g.renderButton(googleRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
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
  }, [googleClientId, account, loaded, lang, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/auth/${tab === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const d = await r.json();
      if (!r.ok) {
        const key = `account.err.${d.error}`;
        const msg = t(key);
        setError(msg === key ? t("account.err.generic") : msg);
        return;
      }
      clearPageCaches(); // the visible data belongs to the account now
      router.refresh();
      await refreshAccount();
      if (next) router.push(next);
    } catch {
      setError(t("account.err.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearPageCaches(); // never paint the signed-out user's data from cache
      setAccount(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <PageLoader />;

  return (
    <div className="space-y-5 pt-2 max-w-md mx-auto">
      <div>
        <h1 className="text-xl font-bold mb-1">{t("account.title")}</h1>
      </div>

      {account ? (
        <div className="space-y-4">
          {/* Profile */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0">
                <UserRound size={20} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {account.name ?? t("account.signedInAs")}
                </div>
                <div className="text-xs text-muted truncate" dir="ltr">
                  {account.email ?? "—"}
                </div>
              </div>
            </div>

            {notice && (
              <p className="text-xs text-secondary bg-secondary-soft rounded-lg p-2.5">
                {notice}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {account.email && (
                <button
                  onClick={() => doRequestReset(account.email!)}
                  disabled={busy}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted hover:text-foreground disabled:opacity-60"
                >
                  {t("account.dashResetPassword")}
                </button>
              )}
              <button
                onClick={signOut}
                disabled={busy}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted hover:text-foreground flex items-center gap-1.5 disabled:opacity-60"
              >
                <LogOut size={14} />
                {t("account.signOut")}
              </button>
            </div>
          </div>

          {next && (
            <button
              onClick={() => router.push(next)}
              className="btn-cta w-full py-3 text-sm"
            >
              {t("welcome.next")}
            </button>
          )}

          {/* Dashboard — the whole journey at a glance */}
          <div className="card p-4">
            <div className="text-xs font-bold text-muted mb-3">
              {t("account.dashboard")}
            </div>
            {!dash ? (
              <PageLoader />
            ) : (
              <>
                <div className="grid grid-cols-3 divide-x divide-border rtl:divide-x-reverse text-center">
                  <div className="px-2">
                    <div className="text-2xl font-bold text-primary tabular-nums">
                      {dash.fullSurahs}
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {t("setup.fullSurahs")}
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-2xl font-bold text-primary tabular-nums">
                      {dash.fullJuz}
                      <span className="text-sm text-muted font-normal"> / 30</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {t("setup.fullJuz")}
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-2xl font-bold text-primary tabular-nums">
                      {dash.totalAyat}
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {t("setup.totalAyat")}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border rtl:divide-x-reverse text-center mt-4 pt-3 border-t border-border">
                  <div className="px-2">
                    <div className="text-2xl font-bold text-accent tabular-nums">
                      {dash.streak}
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {t("account.dashStreak")}
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-2xl font-bold text-accent tabular-nums">
                      {dash.reviews}
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {t("account.dashReviews")}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-5 space-y-4">
          {flow === "forgot" && (
            <form onSubmit={requestReset} className="space-y-3">
              <label className="block text-xs font-medium text-muted space-y-1.5">
                <span>{t("account.email")}</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
                  dir="ltr"
                />
              </label>
              {error && (
                <p className="text-xs text-accent bg-accent-soft rounded-lg p-2.5">{error}</p>
              )}
              {notice && (
                <p className="text-xs text-secondary bg-secondary-soft rounded-lg p-2.5">{notice}</p>
              )}
              <button type="submit" disabled={busy} className="btn-cta w-full py-3 text-sm disabled:opacity-60">
                {t("account.forgot")}
              </button>
              <button
                type="button"
                onClick={() => setFlow("auth")}
                className="w-full text-xs text-muted py-1"
              >
                {t("adhkar.back")}
              </button>
            </form>
          )}

          {flow === "reset" && (
            <form onSubmit={confirmReset} className="space-y-3">
              <label className="block text-xs font-medium text-muted space-y-1.5">
                <span>{t("account.newPassword")}</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 pl-10 text-sm text-foreground"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={t(
                      showPassword ? "account.hidePassword" : "account.showPassword",
                    )}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              {error && (
                <p className="text-xs text-accent bg-accent-soft rounded-lg p-2.5">{error}</p>
              )}
              <button type="submit" disabled={busy} className="btn-cta w-full py-3 text-sm disabled:opacity-60">
                {t("account.resetBtn")}
              </button>
            </form>
          )}

          {flow === "auth" && (<>
          <div className="flex gap-2 p-1 bg-surface-2 rounded-2xl">
            {(["login", "signup"] as const).map((tb) => (
              <button
                key={tb}
                onClick={() => {
                  setTab(tb);
                  setError(null);
                }}
                className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
                  tab === tb ? "bg-surface text-primary shadow-sm" : "text-muted"
                }`}
              >
                {tb === "login" ? t("account.loginTab") : t("account.signupTab")}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {tab === "signup" && (
              <label className="block text-xs font-medium text-muted space-y-1.5">
                <span>{t("account.name")}</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
                />
              </label>
            )}
            <label className="block text-xs font-medium text-muted space-y-1.5">
              <span>{t("account.email")}</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
                dir="ltr"
              />
            </label>
            <label className="block text-xs font-medium text-muted space-y-1.5">
              <span>{t("account.password")}</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 pl-10 text-sm text-foreground"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t(
                    showPassword ? "account.hidePassword" : "account.showPassword",
                  )}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {tab === "login" && (
              <button
                type="button"
                onClick={() => {
                  setFlow("forgot");
                  setError(null);
                  setNotice(null);
                }}
                className="text-xs text-muted underline decoration-dotted"
              >
                {t("account.forgot")}
              </button>
            )}

            {error && (
              <p className="text-xs text-accent bg-accent-soft rounded-lg p-2.5">
                {error}
              </p>
            )}
            {notice && (
              <p className="text-xs text-secondary bg-secondary-soft rounded-lg p-2.5">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-cta w-full py-3 text-sm disabled:opacity-60"
            >
              {tab === "login"
                ? t("account.submitLogin")
                : t("account.submitSignup")}
            </button>
          </form>

          {googleClientId && (
            <div className="pt-1 flex justify-center" ref={googleRef} />
          )}
          </>)}
        </div>
      )}

      {!account && next && (
        <button
          onClick={() => router.push(next)}
          className="w-full text-sm text-muted hover:text-foreground py-2 underline decoration-dotted"
        >
          {t("account.continueWithout")}
        </button>
      )}
    </div>
  );
}
