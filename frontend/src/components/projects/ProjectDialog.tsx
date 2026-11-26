"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fetchProject, HttpError, type ProjectDetail } from "@/lib/api";
import { getStaticProject } from "@/content/projects";
import { PendingBadge, StatusBadge, TechList } from "./Badges";

type DetailState =
  | { kind: "loading"; id: string }
  | { kind: "live"; id: string; data: ProjectDetail }
  | { kind: "offline"; id: string; data: ProjectDetail }
  | { kind: "not-found"; id: string }
  | { kind: "error"; id: string };

interface Props {
  id: string | null;
  lang: Locale;
  t: Dictionary["projects"];
  a11y: Dictionary["a11y"];
  onClose: () => void;
}

export function ProjectDialog({ id, lang, t, a11y, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<DetailState | null>(null);
  // Derive "loading" for a newly requested id without setting state inside the effect.
  const view: DetailState | null = id ? (state && state.id === id ? state : { kind: "loading", id }) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (id && !dialog.open) dialog.showModal();
    if (!id && dialog.open) dialog.close();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetchProject(id, lang, controller.signal)
      .then((data) => setState({ kind: "live", id, data }))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        if (e instanceof HttpError && e.status === 404) {
          setState({ kind: "not-found", id });
          return;
        }
        const fallback = getStaticProject(id, lang);
        setState(fallback ? { kind: "offline", id, data: fallback } : { kind: "error", id });
      });
    return () => controller.abort();
  }, [id, lang]);

  const d = view && (view.kind === "live" || view.kind === "offline") ? view.data : null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="project-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes it.
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="card m-auto max-h-[88svh] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto bg-surface p-0 text-fg"
    >
      <div className="relative p-6 md:p-10">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={a11y.close}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:text-fg"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>

        <div aria-live="polite">
          {!view || view.kind === "loading" ? (
            <>
              <h2 id="project-dialog-title" className="sr-only">
                {t.dialog.loading}
              </h2>
              <p className="flex items-center gap-3 font-mono text-xs text-muted">
                <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border border-ice border-t-transparent" />
                {t.dialog.loading}
              </p>
            </>
          ) : view.kind === "not-found" || view.kind === "error" ? (
            <h2 id="project-dialog-title" className="text-h3 text-fg">
              {view.kind === "not-found" ? t.dialog.notFound : t.dialog.error}
            </h2>
          ) : d ? (
            <article>
              {view.kind === "offline" ? (
                <p className="mb-6 flex items-center gap-2 font-mono text-xs text-warning">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />
                  {t.dialog.offline}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pr-12">
                <StatusBadge status={d.status} t={t} />
                {!d.verified ? <PendingBadge label={t.pending} /> : null}
              </div>
              <h2 id="project-dialog-title" className="mt-6 font-display text-3xl font-semibold tracking-tight text-fg md:text-4xl">
                {d.title}
              </h2>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">{d.category}</p>
              <p className="mt-6 text-muted">{d.description || d.summary}</p>

              {d.highlights.length > 0 ? (
                <section className="mt-8">
                  <h3 className="eyebrow mb-3">{t.dialog.highlights}</h3>
                  <ul className="space-y-2 border-t border-line pt-4">
                    {d.highlights.map((h) => (
                      <li key={h} className="flex gap-3 text-sm text-fg">
                        <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-ice" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="mt-8">
                <h3 className="eyebrow mb-3">{t.dialog.technologies}</h3>
                <TechList items={d.technologies} emptyLabel={t.stackPending} />
              </section>

              <section className="mt-8">
                <h3 className="eyebrow mb-3">{t.dialog.links}</h3>
                {d.liveUrl || d.repoUrl ? (
                  <div className="flex flex-wrap gap-3">
                    {d.liveUrl ? (
                      <a href={d.liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        {t.liveLink} ↗<span className="sr-only"> ({a11y.externalLink})</span>
                      </a>
                    ) : null}
                    {d.repoUrl ? (
                      <a href={d.repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        {t.repoLink} ↗<span className="sr-only"> ({a11y.externalLink})</span>
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{t.dialog.noLinks}</p>
                )}
              </section>
            </article>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
