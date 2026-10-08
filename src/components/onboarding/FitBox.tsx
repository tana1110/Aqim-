"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Illustrations are drawn at one fixed size; this scales them down (never
// up) to whatever space the screen leaves, so a 360×640 phone and a tablet
// show the same composition without clipping.
export function FitBox({
  w,
  h,
  className = "",
  children,
}: {
  w: number;
  h: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setScale(Math.min(1, r.width / w, r.height / h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  return (
    <div ref={ref} className={`relative min-h-0 overflow-hidden ${className}`}>
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: w,
          height: h,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
