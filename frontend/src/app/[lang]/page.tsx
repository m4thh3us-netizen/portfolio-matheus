import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Projects } from "@/components/sections/Projects";
import { Lab } from "@/components/lab/Lab";
import { TechStack } from "@/components/sections/TechStack";
import { Journey } from "@/components/sections/Journey";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { MotionLayer } from "@/components/ui/MotionLayer";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-full bg-ice px-4 py-2 font-medium text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.a11y.skipToContent}
      </a>
      <Header lang={lang} nav={t.nav} a11y={t.a11y} name={t.hero.name} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero t={t.hero} />
        <About t={t.about} />
        <Projects lang={lang} t={t.projects} a11y={t.a11y} />
        <Lab lang={lang} t={t.lab} />
        <TechStack t={t.stack} />
        <Journey t={t.journey} />
        <Contact t={t.contact} a11y={t.a11y} />
      </main>
      <Footer t={t.footer} />
      <MotionLayer />
    </>
  );
}
