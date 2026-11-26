"use client";

import { useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { API_CONFIGURED, API_URL, projectsPath } from "@/lib/api";
import { renderTokens, tokenizeJson } from "@/lib/highlight";

type Result =
  | { kind: "ok"; status: number; statusText: string; ms: number; body: string; json: boolean; count: number | null }
  | { kind: "network"; ms: number; message: string };

export function LiveApi({ lang, t }: { lang: Locale; t: Dictionary["lab"]["live"] }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const endpoint = `${API_URL}${projectsPath(lang)}`;

  const run = async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setRunning(true);
    const start = performance.now();
    try {
      if (!API_CONFIGURED) {
        throw new TypeError("Java API not deployed yet (NEXT_PUBLIC_API_URL is not set)");
      }
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      const text = await res.text();
      const ms = performance.now() - start;
      let body = text;
      let json = false;
      let count: number | null = null;
      try {
        const parsed: unknown = JSON.parse(text);
        body = JSON.stringify(parsed, null, 2);
        json = true;
        if (Array.isArray(parsed)) count = parsed.length;
      } catch {
        /* keep raw text */
      }
      setResult({ kind: "ok", status: res.status, statusText: res.statusText, ms, body, json, count });
    } catch (e) {
      if (controller.signal.aborted) return;
      setResult({ kind: "network", ms: performance.now() - start, message: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    } finally {
      if (inFlight.current === controller) setRunning(false);
    }
  };

  const tokens = useMemo(
    () => (result?.kind === "ok" && result.json ? renderTokens(tokenizeJson(result.body)) : null),
    [result],
  );

  const statusColor =
    result?.kind === "ok"
      ? result.status < 300
        ? "text-success"
        : result.status < 500
          ? "text-warning"
          : "text-danger"
      : "text-danger";

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <h3 className="text-h3 text-fg">{t.title}</h3>
        <p className="mt-3 text-sm text-muted">{t.description}</p>
        <button type="button" onClick={run} disabled={running} aria-busy={running} className="btn btn-primary mt-6">
          {running ? (
            <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-bg border-t-transparent" />
          ) : (
            <span aria-hidden="true" className="font-mono">
              ▶
            </span>
          )}
          {running ? t.running : t.run}
        </button>
      </div>

      <div className="min-w-0 lg:col-span-8">
        <div className="overflow-hidden rounded-panel border border-line bg-bg/70">
          <dl className="grid grid-cols-2 border-b border-line font-mono text-xs sm:grid-cols-[auto_1fr_auto_auto]">
            <div className="border-b border-r border-line px-4 py-3 sm:border-b-0">
              <dt className="text-muted">{t.method}</dt>
              <dd className="mt-1 text-ice">GET</dd>
            </div>
            <div className="order-last col-span-2 border-t border-line px-4 py-3 sm:order-none sm:col-span-1 sm:border-r sm:border-t-0">
              <dt className="text-muted">{t.endpoint}</dt>
              <dd className="mt-1 break-all text-fg">{endpoint}</dd>
            </div>
            <div className="border-b border-r border-line px-4 py-3 sm:border-b-0">
              <dt className="text-muted">{t.status}</dt>
              <dd className={`mt-1 ${result ? statusColor : "text-muted"}`}>
                {result ? (result.kind === "ok" ? `${result.status} ${result.statusText}`.trim() : "ERR") : "—"}
              </dd>
            </div>
            <div className="border-b border-line px-4 py-3 sm:border-b-0">
              <dt className="text-muted">{t.time}</dt>
              <dd className="mt-1 text-fg">{result ? `${result.ms.toFixed(1)} ms` : "—"}</dd>
            </div>
          </dl>

          <div aria-live="polite" aria-busy={running}>
            <div className="flex items-center justify-between px-4 pt-3 font-mono text-micro uppercase tracking-[0.16em] text-muted">
              <span>{t.response}</span>
              {result?.kind === "ok" && result.count !== null ? (
                <span className="normal-case tracking-normal">
                  {result.count} {t.items}
                </span>
              ) : null}
            </div>
            {!result ? (
              <p className="px-4 pb-6 pt-3 font-mono text-xs text-muted">{t.idle}</p>
            ) : result.kind === "network" ? (
              <div className="px-4 pb-6 pt-3 text-sm">
                <p className="font-medium text-danger">{t.networkError}</p>
                <p className="mt-2 text-muted">{t.networkHint}</p>
                <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-xs text-fg">{result.message}</pre>
              </div>
            ) : (
              <>
                {!result.json ? <p className="px-4 pt-3 font-mono text-xs text-warning">{t.nonJson}</p> : null}
                <pre className="max-h-[26rem] overflow-auto px-4 pb-6 pt-3 font-mono text-[0.75rem] leading-relaxed">
                  <code>{tokens ?? result.body}</code>
                </pre>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
