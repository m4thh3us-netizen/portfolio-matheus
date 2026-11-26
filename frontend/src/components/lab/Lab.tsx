"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RequestFlow } from "./RequestFlow";
import { LiveApi } from "./LiveApi";
import { SqlArchitecture } from "./SqlArchitecture";
import { CodeShowcase } from "./CodeShowcase";

const TABS = ["flow", "live", "sql", "code"] as const;
type Tab = (typeof TABS)[number];

export function Lab({ lang, t }: { lang: Locale; t: Dictionary["lab"] }) {
  const [active, setActive] = useState<Tab>("flow");
  const baseId = useId();
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ flow: null, live: null, sql: null, code: null });

  const select = (tab: Tab, focus = false) => {
    setActive(tab);
    if (focus) tabRefs.current[tab]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(active);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(TABS[next], true);
  };

  return (
    <section id="lab" aria-labelledby="lab-title" className="section-y relative">
      <div className="container-x">
        <SectionHeading id="lab" eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

        <div className="card overflow-hidden" data-reveal-group>
          <div
            role="tablist"
            aria-label={t.tabsLabel}
            onKeyDown={onKeyDown}
            className="flex overflow-x-auto border-b border-line [scrollbar-width:none]"
            data-reveal
          >
            {TABS.map((tab, i) => {
              const selected = tab === active;
              return (
                <button
                  key={tab}
                  ref={(el) => {
                    tabRefs.current[tab] = el;
                  }}
                  role="tab"
                  type="button"
                  id={`${baseId}-tab-${tab}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${tab}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(tab)}
                  className={`relative flex shrink-0 items-baseline gap-2.5 px-5 py-4 text-sm transition-colors focus-visible:rounded-input focus-visible:outline-offset-[-4px] md:px-7 md:py-5 ${
                    selected ? "text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  <span className={`font-mono text-micro ${selected ? "text-ice" : ""}`}>
                    {String.fromCharCode(97 + i)}.
                  </span>
                  {t.tabs[tab]}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-ice to-violet transition-opacity ${
                      selected ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {TABS.map((tab) => (
            <div
              key={tab}
              role="tabpanel"
              id={`${baseId}-panel-${tab}`}
              aria-labelledby={`${baseId}-tab-${tab}`}
              hidden={tab !== active}
              tabIndex={0}
              className="p-5 focus-visible:outline-offset-[-2px] md:p-10"
            >
              {/* All panels stay mounted (hidden) so state such as the last API result survives tab switches. */}
              {tab === "flow" && <RequestFlow t={t.flow} />}
              {tab === "live" && <LiveApi lang={lang} t={t.live} />}
              {tab === "sql" && <SqlArchitecture t={t.sql} />}
              {tab === "code" && <CodeShowcase lang={lang} t={t.code} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
