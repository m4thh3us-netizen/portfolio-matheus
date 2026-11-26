import type { Dictionary } from "@/i18n";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function About({ t }: { t: Dictionary["about"] }) {
  const facts = [t.facts.role, t.facts.education, t.facts.location, t.facts.focus];
  return (
    <section id="about" aria-labelledby="about-title" className="section-y relative">
      <div className="container-x">
        <SectionHeading id="about" eyebrow={t.eyebrow} title={t.title} />
        <div className="grid gap-14 md:grid-cols-12" data-reveal-group>
          <div className="md:col-span-7">
            <p className="font-display text-2xl leading-snug tracking-tight text-fg md:text-[2rem]" data-reveal>
              {t.lead}
            </p>
            <p className="mt-6 max-w-xl text-muted md:text-lg" data-reveal>
              {t.body}
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9" data-reveal>
            <h3 className="eyebrow mb-4">{t.factsTitle}</h3>
            <dl className="border-t border-line">
              {facts.map((f) => (
                <div key={f.label} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-line py-4">
                  <dt className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{f.label}</dt>
                  <dd className="text-sm text-fg">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
