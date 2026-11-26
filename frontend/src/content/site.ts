/**
 * Site-wide facts. Only data from docs/content/profile.md.
 * Values equal to PLACEHOLDER are rendered as disabled "coming soon" items, never as links.
 */
export const PLACEHOLDER = "TODO(matheus)" as const;

export const site = {
  name: "Matheus Lopes Spíndola",
  initials: "MLS",
  links: {
    github: PLACEHOLDER as string, // TODO(matheus): GitHub profile URL
    linkedin: PLACEHOLDER as string, // TODO(matheus): LinkedIn profile URL
    email: PLACEHOLDER as string, // TODO(matheus): professional e-mail address
    cv: PLACEHOLDER as string, // TODO(matheus): résumé PDF URL (e.g. /cv.pdf in public/)
  },
};

export const isPlaceholder = (value: string | null | undefined): boolean =>
  !value || value.startsWith("TODO(");

const VERCEL_PRODUCTION_URL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (VERCEL_PRODUCTION_URL ? `https://${VERCEL_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");
