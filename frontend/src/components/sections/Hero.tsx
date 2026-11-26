import type { Dictionary } from "@/i18n";
import { HeroVisual } from "@/components/three/HeroVisual";

export function Hero({ t }: { t: Dictionary["hero"] }) {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-20 pt-28 md:pt-32"
    >
      {/* Mobile/tablet scrim: keeps the bio and CTAs on a calm, high-contrast ground. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-[5] bg-[linear-gradient(180deg,transparent_0%,rgba(8,13,30,0.55)_45%,var(--bg)_100%)] lg:hidden"
      />
      {/*
        Rings: right half from lg up. Below lg a square canvas sits top-right, partly off-screen,
        behind the eyebrow and the first display line (near-white text), not behind the bio.
      */}
      <div
        className="pointer-events-none absolute right-[-38vw] top-[8svh] -z-10 aspect-square w-[118vw] opacity-35 lg:pointer-events-auto lg:inset-y-0 lg:left-1/2 lg:right-0 lg:top-0 lg:aspect-auto lg:w-auto lg:opacity-100"
        data-hero-visual
      >
        <HeroVisual label={t.visualLabel} />
      </div>

      <div className="container-x">
        <div className="lg:grid lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow flex items-center gap-3" data-intro="1">
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-ice shadow-[0_0_12px_var(--ice)]" />
              {t.eyebrow}
            </p>

            <h1 id="hero-title" className="mt-8">
              <span className="block font-display text-lg font-medium tracking-tight text-fg md:text-xl" data-intro="2">
                {t.name}
                <span className="mx-2 text-line-strong" aria-hidden="true">
                  /
                </span>
                <span className="text-ice">{t.role}</span>
              </span>
              <span className="text-display mt-5 block text-balance text-fg" data-intro="3">
                {t.headline}
              </span>
            </h1>

            <p className="mt-8 max-w-[34rem] text-pretty text-base text-muted md:text-lg" data-intro="4">
              {t.bio}
            </p>

            <div className="mt-10 flex flex-wrap gap-3" data-intro="5">
              <a href="#projects" className="btn btn-primary">
                {t.ctaProjects}
                <span aria-hidden="true">→</span>
              </a>
              <a href="#contact" className="btn btn-secondary">
                {t.ctaContact}
              </a>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#about"
        className="eyebrow absolute bottom-8 left-1/2 hidden -translate-x-1/2 items-center gap-3 transition-colors hover:text-fg md:flex"
        data-intro="6"
      >
        <span aria-hidden="true" className="h-8 w-px bg-gradient-to-b from-transparent to-ice" />
        {t.scrollHint}
      </a>
    </section>
  );
}
