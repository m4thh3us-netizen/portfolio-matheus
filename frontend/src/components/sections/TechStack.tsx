import type { Dictionary } from "@/i18n";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Tech {
  name: string;
  core?: boolean;
  note?: "spring";
}

/** Only technologies listed in docs/content/profile.md. No levels, no percentages. */
const STACK: { key: "backend" | "databases" | "frontend" | "tools"; items: Tech[] }[] = [
  {
    key: "backend",
    items: [{ name: "Java", core: true }, { name: "Spring Boot", note: "spring" }, { name: "REST APIs", core: true }, { name: "Python" }],
  },
  { key: "databases", items: [{ name: "SQL", core: true }, { name: "Oracle Database" }, { name: "MySQL" }] },
  { key: "frontend", items: [{ name: "TypeScript" }, { name: "JavaScript" }, { name: "React" }, { name: "Angular" }] },
  { key: "tools", items: [{ name: "Git / GitHub" }, { name: "Docker" }] },
];

export function TechStack({ t }: { t: Dictionary["stack"] }) {
  return (
    <section id="stack" aria-labelledby="stack-title" className="section-y">
      <div className="container-x">
        <SectionHeading id="stack" eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
        <div className="grid border-t border-line md:grid-cols-2 lg:grid-cols-4" data-reveal-group>
          {STACK.map((cat, ci) => (
            <div
              key={cat.key}
              data-reveal
              className={`border-b border-line py-8 md:px-6 lg:border-b-0 ${ci % 2 === 1 ? "md:border-l" : ""} ${ci > 0 ? "lg:border-l" : ""} ${ci === 0 ? "md:pl-0" : ""}`}
            >
              <h3 className="flex items-baseline justify-between">
                <span className="text-h3 text-fg">{t.categories[cat.key]}</span>
                <span className="font-mono text-xs text-muted">{String(ci + 1).padStart(2, "0")}</span>
              </h3>
              <ul className="mt-6 space-y-3">
                {cat.items.map((tech) => (
                  <li key={tech.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className={
                        tech.core
                          ? "font-display text-xl font-medium tracking-tight text-ice"
                          : "font-display text-lg tracking-tight text-fg"
                      }
                    >
                      {tech.name}
                    </span>
                    {tech.core ? (
                      <span className="rounded-full border border-ice/30 px-2 py-0.5 font-mono text-micro uppercase tracking-[0.16em] text-ice">
                        {t.core}
                      </span>
                    ) : null}
                    {tech.note === "spring" ? (
                      <span className="w-full font-mono text-micro text-muted">{t.springNote}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
