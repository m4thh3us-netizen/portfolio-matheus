"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { afterLoadIdle, detect3DCapability } from "@/hooks/useCan3D";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { RingsFallback } from "./RingsFallback";

// The three.js / R3F chunk is only requested once `mount` flips to true.
const RingsScene = dynamic(() => import("./RingsScene"), { ssr: false, loading: () => null });

/**
 * Static SVG rings first (SSR, first paint, LCP-neutral). The WebGL scene is mounted only:
 *  1. after `load` + an idle period (never competes with hydration / first paint);
 *  2. while the hero is in (or near) the viewport;
 *  3. when motion is allowed and the device passes `detect3DCapability`.
 * The SVG stays visible until the canvas has rendered its first frame, then they crossfade.
 */
export function HeroVisual({ label }: { label: string }) {
  const reduced = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [idle, setIdle] = useState(false);
  const [inView, setInView] = useState(false);
  const [capable, setCapable] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) return;
    return afterLoadIdle(() => setIdle(true));
  }, [reduced]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  // Capability probe (creates a throwaway WebGL context, cached) only once we would actually
  // mount. Latched in state so scrolling away pauses the canvas instead of unmounting it.
  if (idle && inView && !reduced && !capable && detect3DCapability()) setCapable(true);

  const mount = capable && !reduced;
  const showCanvas = mount && ready;

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      className="relative h-full w-full [mask-image:radial-gradient(closest-side,#000_78%,transparent_100%)]"
    >
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: showCanvas ? 0 : 1 }}
        aria-hidden="true"
      >
        <RingsFallback />
      </div>
      {mount ? (
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: showCanvas ? 1 : 0 }}
          aria-hidden="true"
        >
          <RingsScene active={inView} onReady={() => setReady(true)} />
        </div>
      ) : null}
    </div>
  );
}
