"use client";

import { useRef, type PointerEvent } from "react";
import type { Dictionary } from "@/i18n";
import type { ProjectSummary } from "@/lib/api";
import { prefersReducedMotion } from "@/hooks/useMediaQuery";
import { PendingBadge, StatusBadge, TechList } from "./Badges";

interface Props {
  project: ProjectSummary;
  index: number;
  /** Featured (first) card: wider slot and a larger title. */
  featured?: boolean;
  t: Dictionary["projects"];
  a11y: Dictionary["a11y"];
  onOpen: (id: string, trigger: HTMLElement) => void;
}

const MAX_TILT = 2.5; // degrees

export function ProjectCard({ project: p, index, featured = false, t, a11y, onOpen }: Props) {
  const ref = useRef<HTMLElement>(null);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * MAX_TILT).toFixed(2)}deg) rotateY(${(x * MAX_TILT).toFixed(2)}deg)`;
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <article
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="card group relative flex w-full flex-col overflow-hidden p-6 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease)] [transform-style:preserve-3d] hover:border-electric/40 hover:shadow-[var(--glow)] focus-within:shadow-[var(--glow)]"
    >
      {/* Specular highlight following the pointer */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--mx,50%) var(--my,0%), rgba(183,228,255,0.05), transparent 45%)" }}
      />
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <StatusBadge status={p.status} t={t} />
        </div>
      </div>

      <p className="mt-8 font-mono text-micro uppercase tracking-[0.16em] text-muted">{p.category}</p>
      <h3
        className={
          featured
            ? "mt-3 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-fg"
            : "mt-2 text-h3 text-fg"
        }
      >
        <button
          type="button"
          onClick={(e) => onOpen(p.id, e.currentTarget)}
          className="text-left after:absolute after:inset-0 after:rounded-[13px] after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ice"
          aria-haspopup="dialog"
        >
          {p.title}
        </button>
      </h3>
      <p className={featured ? "mt-4 max-w-2xl flex-1 text-base text-muted" : "mt-3 flex-1 text-sm text-muted"}>{p.summary}</p>

      {!p.verified ? (
        <div className="mt-5">
          <PendingBadge label={t.pending} />
        </div>
      ) : null}

      <div className="mt-6 border-t border-line pt-5">
        <TechList items={p.technologies} emptyLabel={t.stackPending} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="font-mono text-xs text-ice transition-transform group-hover:translate-x-1" aria-hidden="true">
          {t.openDetails} →
        </span>
        {p.liveUrl ? (
          <a
            href={p.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 font-mono text-xs text-fg underline decoration-line-strong underline-offset-4 hover:decoration-ice"
          >
            {t.liveLink} ↗<span className="sr-only"> ({a11y.externalLink})</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
