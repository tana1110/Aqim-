"use client";

// Re-mounts on every route change inside the app, giving each page one
// consistent fade-in — navigation feels continuous instead of flashing.
export default function Template({ children }: { children: React.ReactNode }) {
  // animate-route fades opacity ONLY — never a transform, which would trap
  // fixed-position overlays inside the page (see globals.css).
  return <div className="animate-route">{children}</div>;
}
