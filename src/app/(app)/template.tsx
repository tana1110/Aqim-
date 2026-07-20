"use client";

// Re-mounts on every route change inside the app, giving each page one
// consistent fade-in — navigation feels continuous instead of flashing.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
