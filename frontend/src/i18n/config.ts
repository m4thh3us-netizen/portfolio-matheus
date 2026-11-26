export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt";
export const LANG_COOKIE = "lang";

export const isLocale = (value: string | undefined | null): value is Locale =>
  !!value && (locales as readonly string[]).includes(value);

/** BCP 47 tags used for <html lang>, hreflang and OpenGraph. */
export const htmlLang: Record<Locale, string> = { pt: "pt-BR", en: "en" };
export const ogLocale: Record<Locale, string> = { pt: "pt_BR", en: "en_US" };
