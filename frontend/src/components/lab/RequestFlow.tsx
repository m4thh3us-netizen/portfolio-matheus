"use client";

import { Fragment, useState } from "react";
import type { Dictionary } from "@/i18n";

const NODES = ["client", "api", "controller", "service", "data", "response"] as const;
type NodeKey = (typeof NODES)[number];

const TAGS: Record<NodeKey, string> = {
  client: "fetch()",
  api: "HTTP · CORS",
  controller: "@RestController",
  service: "@Service",
  data: "Catalog / Repository",
  response: "200 · JSON",
};

export function RequestFlow({ t }: { t: Dictionary["lab"]["flow"] }) {
  const [selected, setSelected] = useState<NodeKey>("client");
  const index = NODES.indexOf(selected);
  const node = t.nodes[selected];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="text-h3 text-fg">{t.title}</h3>
        <p className="font-mono text-xs text-muted">{t.hint}</p>
      </div>

      {/* xl: horizontal pipeline; sm–lg: 2/3-column grid; mobile: vertical. */}
      <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-row xl:items-center xl:gap-0">
        {NODES.map((key, i) => {
          const active = key === selected;
          const passed = i <= index;
          return (
            <Fragment key={key}>
              <li className="xl:flex-1">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(key)}
                  className={`group relative w-full rounded-panel border px-4 py-4 text-left transition-[border-color,background-color,box-shadow] duration-300 ${
                    active
                      ? "border-electric/60 bg-electric/10 shadow-[var(--glow)]"
                      : passed
                        ? "border-ice/25 bg-bg/40 hover:border-ice/50"
                        : "border-line bg-bg/40 hover:border-ice/40"
                  }`}
                >
                  <span className="block font-mono text-micro text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`mt-1 block font-display text-base font-medium tracking-tight ${active ? "text-ice" : "text-fg"}`}>
                    {t.nodes[key].name}
                  </span>
                  <span className="mt-1 block truncate font-mono text-micro text-muted">{TAGS[key]}</span>
                </button>
              </li>
              {i < NODES.length - 1 ? (
                <li aria-hidden="true" className="relative mx-auto h-8 w-px sm:hidden xl:mx-0 xl:block xl:h-px xl:w-10 xl:flex-none">
                  <span className={`absolute inset-0 ${i < index ? "bg-ice/60" : "bg-line-strong"}`} />
                  {/* Packets travel only along the path already taken up to the selected layer. */}
                  {i < index ? (
                    <span
                      className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ice shadow-[0_0_10px_var(--ice)] max-xl:left-1/2 max-xl:animate-[packet-y_1.8s_linear_infinite] xl:top-1/2 xl:animate-[packet_1.8s_linear_infinite]"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                  ) : null}
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>

      <div className="mt-10 grid gap-6 border-t border-line pt-8 md:grid-cols-12" aria-live="polite">
        <div className="md:col-span-4">
          <p className="eyebrow">{t.responsibility}</p>
          <p className="mt-2 font-display text-2xl font-medium tracking-tight text-ice">{node.name}</p>
          <p className="mt-1 font-mono text-xs text-muted">{TAGS[selected]}</p>
        </div>
        <p className="text-muted md:col-span-8 md:text-lg">{node.detail}</p>
      </div>
    </div>
  );
}
