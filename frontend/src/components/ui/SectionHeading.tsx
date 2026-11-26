import type { ReactNode } from "react";

interface Props {
  id: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  aside?: ReactNode;
}

/** Editorial section header: mono eyebrow, hairline, display title, optional lead. */
export function SectionHeading({ id, eyebrow, title, lead, aside }: Props) {
  return (
    <header className="mb-14 md:mb-20" data-reveal-group>
      <div className="flex items-center gap-4" data-reveal>
        <p className="eyebrow text-ice">{eyebrow}</p>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        {aside}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-12 md:items-end">
        <h2 id={`${id}-title`} className="text-h2 text-fg md:col-span-7" data-reveal>
          {title}
        </h2>
        {lead ? (
          <p className="max-w-xl text-muted md:col-span-5 md:justify-self-end" data-reveal>
            {lead}
          </p>
        ) : null}
      </div>
    </header>
  );
}
