"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { codeSnippets, SNIPPETS_PENDING } from "@/content/code-snippets";
import { renderTokens, tokenizeJava } from "@/lib/highlight";

export function CodeShowcase({ lang, t }: { lang: Locale; t: Dictionary["lab"]["code"] }) {
  const [selectedId, setSelectedId] = useState(codeSnippets[0]?.id ?? "");
  const snippet = codeSnippets.find((s) => s.id === selectedId) ?? codeSnippets[0];
  const tokens = useMemo(() => (snippet ? renderTokens(tokenizeJava(snippet.code)) : null), [snippet]);

  if (SNIPPETS_PENDING || !snippet) {
    return (
      <div>
        <h3 className="text-h3 text-fg">{t.title}</h3>
        <p className="mt-3 text-sm text-muted">{t.pending}</p>
      </div>
    );
  }

  const lines = snippet.code.split("\n").length;
  const firstLine = Number.parseInt(snippet.lines, 10) || 1;

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <h3 className="text-h3 text-fg">{t.title}</h3>
        <p className="mt-3 text-sm text-muted">{t.description}</p>
        <div className="mt-6 flex flex-col gap-1" role="group" aria-label={t.snippetsLabel}>
          {codeSnippets.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === snippet.id}
              onClick={() => setSelectedId(s.id)}
              className={`flex items-baseline gap-3 rounded-input border px-4 py-3 text-left text-sm transition-colors ${
                s.id === snippet.id ? "border-electric/50 bg-electric/10 text-fg" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              <span className="font-mono text-micro text-muted">{String(i + 1).padStart(2, "0")}</span>
              {s.title[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 lg:col-span-8" aria-live="polite">
        <div className="overflow-hidden rounded-panel border border-line bg-bg/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 font-mono text-micro">
            <span className="text-muted">
              {t.file}: <span className="break-all text-fg">{snippet.path}</span>
            </span>
            <span className="text-muted">L{snippet.lines}</span>
          </div>
          <div className="flex max-h-[28rem] overflow-auto font-mono text-[0.75rem] leading-relaxed">
            <span aria-hidden="true" className="sticky left-0 select-none border-r border-line bg-bg px-3 py-4 text-right text-muted/60">
              {Array.from({ length: lines }, (_, i) => (
                <span key={i} className="block">
                  {firstLine + i}
                </span>
              ))}
            </span>
            <pre className="flex-1 px-4 py-4">
              <code>{tokens}</code>
            </pre>
          </div>
        </div>
        <p className="mt-5 text-sm text-muted">{snippet.explanation[lang]}</p>
      </div>
    </div>
  );
}
