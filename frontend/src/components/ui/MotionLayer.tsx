"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/hooks/useMediaQuery";
import { afterLoadIdle } from "@/hooks/useCan3D";

const EASE = "expo.out";
const SCROLL_IDLE_MS = 200;

/** Tracks whether the page is scrolling; `whenIdle` runs a callback once scrolling settles. */
function createScrollIdle() {
  let scrolling = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue = new Set<() => void>();

  const settle = () => {
    clearTimeout(timer);
    if (!scrolling) return;
    scrolling = false;
    const jobs = Array.from(queue);
    queue.clear();
    jobs.forEach((job) => job());
  };
  const onScroll = () => {
    scrolling = true;
    clearTimeout(timer);
    timer = setTimeout(settle, SCROLL_IDLE_MS);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", settle);

  return {
    whenIdle(job: () => void) {
      if (scrolling) queue.add(job);
      else job();
    },
    dispose() {
      clearTimeout(timer);
      queue.clear();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", settle);
    },
  };
}

/**
 * Progressive-enhancement scroll reveals. Content is fully visible in the SSR HTML and
 * stays visible until GSAP is ready; nothing above the fold is ever hidden.
 *  - The hero intro is pure CSS (see `[data-intro]` in globals.css) — not handled here.
 *  - [data-reveal]: staggered reveal on scroll, batched by ScrollTrigger.batch.
 *
 * GSAP core + ScrollTrigger are imported lazily after `load` + idle, so they never sit in
 * the initial bundle nor compete with hydration / first paint.
 *
 * Scroll safety (QA-05): `ScrollTrigger.refresh()` restores the scroll position, which
 * cancels a native smooth scroll in progress (e.g. a header anchor link). Setup and every
 * refresh therefore wait until scrolling has settled (`scrollend`, or 200 ms without scroll
 * events), and ScrollTrigger's own `resize` auto-refresh is replaced by that gated path.
 */
export function MotionLayer() {
  useEffect(() => {
    if (prefersReducedMotion()) return; // CSS keeps everything visible and static.

    let disposed = false;
    let cleanup: (() => void) | undefined;
    const scroll = createScrollIdle();

    const setup = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      // No automatic refresh on `resize`: the body ResizeObserver below covers it, gated on scroll.
      ScrollTrigger.config({ autoRefreshEvents: "visibilitychange,DOMContentLoaded,load" });

      // Only items still below the fold are hidden; anything already seen stays put.
      const fold = window.innerHeight * 0.92;
      const pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
        (el) => el.getBoundingClientRect().top > fold,
      );
      if (!pending.length) return;

      const ctx = gsap.context(() => {
        gsap.set(pending, { opacity: 0, y: 24 });
        ScrollTrigger.batch(pending, {
          start: "top 88%",
          once: true,
          interval: 0.1,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.08, overwrite: true }),
        });
      });

      // Fonts, viewport resizes or late content can change the page height after setup —
      // recompute trigger positions, debounced and never while a scroll is in progress.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const refresh = () => {
        clearTimeout(timer);
        timer = setTimeout(() => scroll.whenIdle(() => !disposed && ScrollTrigger.refresh()), 150);
      };
      document.fonts?.ready.then(refresh).catch(() => {});
      const ro = new ResizeObserver(refresh);
      ro.observe(document.body);

      cleanup = () => {
        clearTimeout(timer);
        ro.disconnect();
        ctx.revert();
        pending.forEach((el) => {
          el.style.opacity = "";
          el.style.transform = "";
        });
      };
    };

    // Never start (hide items, create triggers) in the middle of a scroll / anchor navigation.
    const cancelIdle = afterLoadIdle(() => scroll.whenIdle(() => void setup()));

    return () => {
      disposed = true;
      cancelIdle();
      scroll.dispose();
      cleanup?.();
    };
  }, []);

  return null;
}
