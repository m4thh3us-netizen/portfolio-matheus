import type { Dictionary } from "@/i18n";
import { isPlaceholder, site } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/contact/ContactForm";

const CHANNELS = ["github", "linkedin", "email", "cv"] as const;

function hrefFor(key: (typeof CHANNELS)[number], value: string): string {
  return key === "email" ? `mailto:${value}` : value;
}

export function Contact({ t, a11y }: { t: Dictionary["contact"]; a11y: Dictionary["a11y"] }) {
  return (
    <section id="contact" aria-labelledby="contact-title" className="section-y relative">
      <div className="container-x">
        <SectionHeading id="contact" eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
        <div className="grid gap-14 lg:grid-cols-12" data-reveal-group>
          <div className="lg:col-span-4" data-reveal>
            <h3 className="eyebrow mb-4">{t.linksTitle}</h3>
            <ul className="border-t border-line">
              {CHANNELS.map((key) => {
                const value = site.links[key];
                const pending = isPlaceholder(value);
                const external = key === "github" || key === "linkedin" || key === "cv";
                return (
                  <li key={key} className="border-b border-line">
                    {pending ? (
                      <span
                        aria-disabled="true"
                        className="flex items-center justify-between py-4 text-muted/70"
                      >
                        <span className="font-display text-lg tracking-tight">{t.links[key]}</span>
                        <span className="rounded-full border border-dashed border-line-strong px-2.5 py-1 font-mono text-micro uppercase tracking-[0.14em]">
                          {t.comingSoon}
                        </span>
                      </span>
                    ) : (
                      <a
                        href={hrefFor(key, value)}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="group flex items-center justify-between py-4 text-fg transition-colors hover:text-ice"
                      >
                        <span className="font-display text-lg tracking-tight">{t.links[key]}</span>
                        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                          ↗
                        </span>
                        {external ? <span className="sr-only"> ({a11y.externalLink})</span> : null}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="lg:col-span-7 lg:col-start-6" data-reveal>
            <ContactForm t={t.form} />
          </div>
        </div>
      </div>
    </section>
  );
}
