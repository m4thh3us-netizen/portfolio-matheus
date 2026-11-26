"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fetchProjects, type ProjectSummary } from "@/lib/api";
import { getStaticProjects } from "@/content/projects";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectDialog } from "@/components/projects/ProjectDialog";

/**
 * The bundled copy (identical to the API data) is the initial, server-rendered list, so the
 * cards exist without JavaScript and nothing shifts when live data arrives. The source label
 * stays honest: "offline" is only shown after the live request has actually failed.
 */
type State =
  | { kind: "checking"; items: ProjectSummary[] }
  | { kind: "live"; items: ProjectSummary[] }
  | { kind: "offline"; items: ProjectSummary[] };

const noopSubscribe = () => () => {};
/** false during SSR / hydration-less rendering, true once running in the browser. */
const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

interface Props {
  lang: Locale;
  t: Dictionary["projects"];
  a11y: Dictionary["a11y"];
}

/**
 * The first project is featured (wider card). On the 3-column lg grid it spans 2 columns,
 * or the full row when that is what leaves no empty cell at the end (e.g. 7 projects).
 */
function featuredSpanLg(count: number): string {
  return (count - 1) % 3 === 0 ? "lg:col-span-3" : "lg:col-span-2";
}

export function Projects({ lang, t, a11y }: Props) {
  const [state, setState] = useState<State>(() => ({ kind: "checking", items: getStaticProjects(lang) }));
  const hydrated = useHydrated();
  const [attempt, setAttempt] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(lang, controller.signal)
      .then((items) => setState({ kind: "live", items }))
      .catch(() => {
        if (controller.signal.aborted) return;
        // Honest fallback: keep the bundled copy, now explicitly labeled as offline.
        setState({ kind: "offline", items: getStaticProjects(lang) });
      });
    return () => controller.abort();
  }, [lang, attempt]);

  const retry = () => {
    setState((s) => ({ kind: "checking", items: s.items }));
    setAttempt((n) => n + 1);
  };

  const open = useCallback((id: string, trigger: HTMLElement) => {
    returnFocus.current = trigger;
    setOpenId(id);
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
    returnFocus.current?.focus();
  }, []);

  return (
    <section id="projects" aria-labelledby="projects-title" className="section-y relative">
      <div className="container-x">
        <SectionHeading id="projects" eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

        <div aria-live="polite" className="mb-8 min-h-6">
          {state.kind === "checking" ? (
            // Without JS no request is made, so no status is claimed (the space is reserved).
            hydrated ? (
              <p className="flex items-center gap-3 font-mono text-xs text-muted">
                <span aria-hidden="true" className="h-3 w-3 animate-[spin_0.9s_linear_infinite] rounded-full border border-ice border-t-transparent" />
                {t.checkingLive}
              </p>
            ) : null
          ) : state.kind === "offline" ? (
            <p className="flex flex-wrap items-center gap-3 font-mono text-xs text-warning">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />
              {t.offlineNote}
              <button type="button" onClick={retry} className="text-muted underline underline-offset-4 hover:text-fg">
                {t.retry}
              </button>
            </p>
          ) : (
            <p className="flex items-center gap-3 font-mono text-xs text-success">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_10px_var(--success)]" />
              {t.liveSource}
            </p>
          )}
        </div>

        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {state.items.map((p, i) => (
            <li key={p.id} className={i === 0 ? `flex md:col-span-2 ${featuredSpanLg(state.items.length)}` : "flex"}>
              <ProjectCard project={p} index={i} featured={i === 0} t={t} a11y={a11y} onOpen={open} />
            </li>
          ))}
        </ul>
      </div>

      <ProjectDialog id={openId} lang={lang} t={t} a11y={a11y} onClose={close} />
    </section>
  );
}
