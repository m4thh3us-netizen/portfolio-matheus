"use client";

import type { MouseEvent } from "react";
import type { Dictionary } from "@/i18n";
import { LANG_COOKIE, type Locale } from "@/i18n/config";

/** Persists the choice (cookie read by the proxy + localStorage) and lets the plain <a> do a full navigation. */
export function LangSwitch({ lang, a11y }: { lang: Locale; a11y: Dictionary["a11y"] }) {
  const target: Locale = lang === "pt" ? "en" : "pt";

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    document.cookie = `${LANG_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(LANG_COOKIE, target);
    } catch {
      /* storage may be unavailable */
    }
    // Keep the current section; the browser performs a full navigation (fresh render in the new language).
    e.currentTarget.href = `/${target}${window.location.hash}`;
  };

  return (
    <a
      href={`/${target}`}
      hrefLang={target === "pt" ? "pt-BR" : "en"}
      onClick={onClick}
      aria-label={a11y.switchLanguage}
      className="flex h-10 items-center gap-1 rounded-full border border-line-strong px-3 font-mono text-xs tracking-widest transition-colors hover:border-ice"
    >
      <span className={lang === "pt" ? "text-ice" : "text-muted"}>PT</span>
      <span aria-hidden="true" className="text-muted">
        /
      </span>
      <span className={lang === "en" ? "text-ice" : "text-muted"}>EN</span>
    </a>
  );
}
