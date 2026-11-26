import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["pt", "en"] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT: Locale = "pt";

const isLocale = (v: string | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);

/** Picks the best supported language from Accept-Language (respecting q-values). */
function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number.parseFloat(q.split("=")[1]) : 1 };
    })
    .filter((x) => x.base && !Number.isNaN(x.q) && x.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { base } of ranked) if (isLocale(base)) return base;
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return;

  const cookie = request.cookies.get("lang")?.value;
  const locale = isLocale(cookie) ? cookie : (fromAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT);

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, metadata files and anything with a file extension.
  matcher: ["/((?!_next|api|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)"],
};
