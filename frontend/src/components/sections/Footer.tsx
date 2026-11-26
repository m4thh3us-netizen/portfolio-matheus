import type { Dictionary } from "@/i18n";

export function Footer({ t }: { t: Dictionary["footer"] }) {
  return (
    <footer className="border-t border-line">
      <div className="container-x flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg tracking-tight text-fg">{t.rights}</p>
          <p className="mt-1 text-sm text-muted">{t.built}</p>
        </div>
        <div>
          <a href="#top" className="eyebrow inline-flex items-center gap-2 transition-colors hover:text-fg">
            {t.backToTop}
            <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
