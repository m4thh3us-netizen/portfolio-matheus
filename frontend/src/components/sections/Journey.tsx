import type { Dictionary } from "@/i18n";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Journey({ t }: { t: Dictionary["journey"] }) {
  const { start, next } = t.items;
  return (
    <section id="journey" aria-labelledby="journey-title" className="section-y">
      <div className="container-x">
        <SectionHeading id="journey" eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
        <ol className="relative ml-2 border-l border-line md:ml-0" data-reveal-group>
          <li className="relative grid gap-3 pb-14 pl-8 md:grid-cols-12 md:gap-8 md:pl-12" data-reveal>
            <span
              aria-hidden="true"
              className="absolute -left-[5px] top-2 h-[9px] w-[9px] rounded-full bg-ice shadow-[0_0_16px_var(--ice)]"
            />
            <p className="font-mono text-sm text-ice md:col-span-2">{start.year}</p>
            <div className="md:col-span-8">
              <h3 className="text-h3 text-fg">{start.title}</h3>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-muted">{start.place}</p>
              <p className="mt-4 max-w-xl text-muted">{start.text}</p>
            </div>
          </li>
          {/* TODO(matheus): add confirmed experience entries here. */}
          <li className="relative grid gap-3 pl-8 md:grid-cols-12 md:gap-8 md:pl-12" data-reveal>
            <span
              aria-hidden="true"
              className="absolute -left-[5px] top-2 h-[9px] w-[9px] rounded-full border border-line-strong bg-bg"
            />
            <p className="font-mono text-sm text-muted md:col-span-2">{next.year}</p>
            <div className="rounded-card border border-dashed border-line-strong p-6 md:col-span-8">
              <h3 className="text-h3 text-muted">{next.title}</h3>
              <p className="mt-2 text-sm text-muted">{next.text}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
