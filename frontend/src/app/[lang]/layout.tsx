import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "../globals.css";
import { htmlLang, isLocale, locales, ogLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { SITE_URL } from "@/content/site";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#080D1E",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: t.title,
    description: t.description,
    alternates: {
      canonical: `/${lang}`,
      languages: { "pt-BR": "/pt", en: "/en", "x-default": "/pt" },
    },
    openGraph: {
      type: "website",
      url: `/${lang}`,
      title: t.title,
      description: t.description,
      siteName: t.siteName,
      locale: ogLocale[lang],
      alternateLocale: locales.filter((l) => l !== lang).map((l) => ogLocale[l]),
    },
    twitter: { card: "summary", title: t.title, description: t.description },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html
      lang={htmlLang[lang]}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
