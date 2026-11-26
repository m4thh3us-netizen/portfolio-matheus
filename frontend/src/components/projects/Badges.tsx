import type { Dictionary } from "@/i18n";
import type { ProjectStatus } from "@/lib/api";

const STATUS_STYLE: Record<ProjectStatus, string> = {
  PUBLISHED: "border-success/40 text-success",
  ACADEMIC: "border-ice/35 text-ice",
  IN_PROGRESS: "border-electric/45 text-electric",
  STUDY: "border-violet/45 text-violet",
};

const pill = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-micro uppercase leading-none tracking-[0.12em]";

export function StatusBadge({ status, t }: { status: ProjectStatus; t: Dictionary["projects"] }) {
  return (
    <span className={`${pill} ${STATUS_STYLE[status] ?? "border-line text-muted"}`}>
      {status === "IN_PROGRESS" ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {t.status[status] ?? status}
    </span>
  );
}

export function PendingBadge({ label }: { label: string }) {
  return <span className={`${pill} border-dashed border-warning/50 normal-case leading-snug tracking-normal text-warning`}>{label}</span>;
}

export function TechList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="font-mono text-xs italic text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((tech) => (
        <li key={tech} className="rounded-full border border-line bg-bg/40 px-2.5 py-1 font-mono text-micro text-muted">
          {tech}
        </li>
      ))}
    </ul>
  );
}
