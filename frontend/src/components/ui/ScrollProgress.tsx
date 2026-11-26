"use client";

import { useEffect, useRef } from "react";

/** Hairline reading-progress bar. Updates via rAF + transform, no React re-renders. */
export function ScrollProgress({ label }: { label: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      wrapRef.current?.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      className="absolute inset-x-0 bottom-0 h-px overflow-hidden"
    >
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-ice via-electric to-violet"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
