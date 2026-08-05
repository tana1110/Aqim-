// Mirrors the on-device state (wird, streak cache, tasbih, focus,
// completions, preferences) to the server so nothing is lost when the
// browser data is cleared or the account moves devices.
// localStorage stays the fast offline copy; the server is the truth.

const STATIC_KEYS = [
  "aqim-wird",
  "aqim-wird-days",
  "aqim-adhkar-days",
  "aqim-tasbih",
  "aqim-focus",
  // "aqim-streak" is NOT mirrored here — the streak has its own API and
  // the server copy is the truth; syncing the cache would fight it.
  "aqim-passage-len",
  "aqim-widgets",
  "aqim-reciter",
  "aqim-quran-page",
  "aqim-onboarded",
  "aqim-tour-done",
  "aqim-quran-hint-seen",
  "aqim-adhkar-hint",
  "aqim-lang",
  "aqim-font-scale",
  "aqim-reminder",
];
const DAY_PREFIXES = [
  "aqim-adhkar-parts:",
  "aqim-adhkar-taps:",
  "aqim-wird-read:",
];
const TS_KEY = "aqim-sync-ts";

export function collectState(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const k of STATIC_KEYS) {
      const v = localStorage.getItem(k);
      if (v != null) out[k] = v;
    }
    // day-keyed entries: only recent ones (last 3 days worth of keys)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (DAY_PREFIXES.some((p) => k.startsWith(p))) {
        const v = localStorage.getItem(k);
        if (v != null) out[k] = v;
      }
    }
  } catch {}
  return out;
}

export function applyState(data: Record<string, string>, ts: number) {
  try {
    for (const [k, v] of Object.entries(data)) {
      if (STATIC_KEYS.includes(k) || DAY_PREFIXES.some((p) => k.startsWith(p))) {
        localStorage.setItem(k, v);
      }
    }
    localStorage.setItem(TS_KEY, String(ts));
    for (const ev of [
      "aqim-wird-changed",
      "aqim-tasbih-changed",
      "aqim-widgets-changed",
      "aqim-streak-changed",
      "aqim-reminder-changed",
    ]) {
      window.dispatchEvent(new Event(ev));
    }
  } catch {}
}

export function localSyncTs(): number {
  try {
    return Number(localStorage.getItem(TS_KEY)) || 0;
  } catch {
    return 0;
  }
}

export async function pushState(): Promise<void> {
  const ts = Date.now();
  try {
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: collectState(), ts }),
    });
    localStorage.setItem(TS_KEY, String(ts));
  } catch {}
}

// Boot: if the server has a newer snapshot (fresh install, other device),
// adopt it; otherwise push ours so the server catches up.
export async function bootSync(): Promise<void> {
  try {
    const res = await fetch("/api/state");
    if (!res.ok) return;
    const { data, ts } = (await res.json()) as {
      data: Record<string, string> | null;
      ts: number;
    };
    const local = localSyncTs();
    if (data && ts > local) {
      applyState(data, ts);
    } else {
      await pushState();
    }
  } catch {}
}
