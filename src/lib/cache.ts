// Per-session page snapshots (aqim-c:*) make revisits paint instantly.
// They are ACCOUNT-SCOPED data — always clear them when auth changes.
export function clearPageCaches() {
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith("aqim-c:")) sessionStorage.removeItem(k);
    }
  } catch {}
}
