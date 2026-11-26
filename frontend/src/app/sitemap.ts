import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { locales } from "@/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((lang) => ({
    url: `${SITE_URL}/${lang}`,
    changeFrequency: "monthly",
    priority: lang === "pt" ? 1 : 0.9,
    alternates: {
      languages: { "pt-BR": `${SITE_URL}/pt`, en: `${SITE_URL}/en` },
    },
  }));
}
