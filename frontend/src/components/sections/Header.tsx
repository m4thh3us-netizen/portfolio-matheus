"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { ScrollProgress } from "@/components/ui/ScrollProgress";

interface Props {
  lang: Locale;
  nav: Dictionary["nav"];
  a11y: Dictionary["a11y"];
  name: string;
}

const SECTIONS = ["about", "projects", "lab", "stack", "journey", "contact"] as const;
type SectionId = (typeof SECTIONS)[number];

export function Header({ lang, nav, a11y, name }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<SectionId | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Current-section state for the nav: the section crossing a band around 40% of the viewport.
  useEffect(() => {
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setCurrent(hit.target.id as SectionId);
        else if (window.scrollY < window.innerHeight * 0.5) setCurrent(null);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Once the page scrolls, the header switches to the denser glass.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Keep focus cycling within the menu button + panel while open.
      const focusables = [buttonRef.current, ...Array.from(panel.querySelectorAll<HTMLElement>("a, button"))].filter(
        (el): el is HTMLElement => !!el,
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`border-b border-line backdrop-blur-[16px] transition-colors duration-300 ${scrolled ? "bg-glass-strong" : "bg-glass"}`}
      >
        <div className="container-x flex h-16 items-center justify-between gap-6">
          <a href="#top" className="group flex items-center gap-3" aria-label={`${name} — ${nav.home}`}>
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full border border-line-strong font-mono text-micro tracking-widest text-ice transition-colors group-hover:border-ice"
            >
              MLS
            </span>
            <span className="hidden whitespace-nowrap font-display text-sm font-medium tracking-tight text-fg sm:inline md:hidden lg:inline">{name}</span>
          </a>

          <nav aria-label={a11y.primaryNav} className="hidden md:block">
            <ul className="flex items-center gap-1">
              {SECTIONS.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    aria-current={current === id ? "true" : undefined}
                    className={`relative whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-px after:bg-ice after:transition-opacity after:content-[''] hover:text-fg ${
                      current === id ? "text-fg after:opacity-100" : "text-muted after:opacity-0"
                    }`}
                  >
                    {nav[id]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <LangSwitch lang={lang} a11y={a11y} />
            <button
              ref={buttonRef}
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border border-line-strong text-fg md:hidden"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? a11y.closeMenu : a11y.openMenu}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden="true" className="relative block h-3 w-4">
                <span
                  className={`absolute left-0 h-px w-4 bg-current transition-transform duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`}
                />
                <span
                  className={`absolute left-0 h-px w-4 bg-current transition-transform duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`}
                />
              </span>
            </button>
          </div>
        </div>
        <ScrollProgress label={a11y.scrollProgress} />
      </div>

      <div
        id={menuId}
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-16 border-t border-line bg-glass-strong backdrop-blur-[16px] md:hidden"
      >
        <nav aria-label={a11y.primaryNav} className="container-x pt-10">
          <ul className="flex flex-col">
            {SECTIONS.map((id, i) => (
              <li key={id} className="border-b border-line">
                <a
                  href={`#${id}`}
                  aria-current={current === id ? "true" : undefined}
                  onClick={() => close(false)}
                  className="flex items-baseline gap-4 py-5 font-display text-3xl tracking-tight text-fg"
                >
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                  {nav[id]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
