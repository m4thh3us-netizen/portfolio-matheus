# Portfolio frontend

Next.js (App Router) + React + TypeScript (strict) + Tailwind CSS, with a React Three Fiber hero scene and GSAP
scroll motion. Talks to the Spring Boot API in `../backend` following `../docs/api/contracts.md`.

## Scripts

Run inside `frontend/`:

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Dev server on http://localhost:3000            |
| `npm run build`      | Production build (static `/pt` and `/en`)      |
| `npm run start`      | Serves the production build                    |
| `npm run lint`       | ESLint (`eslint-config-next`)                  |
| `npx tsc --noEmit`   | Type check                                     |

## Environment variables

Only public, non-secret values. Never put secrets in `NEXT_PUBLIC_*` (they are inlined into the client bundle).

| Variable               | Default                 | Used for                                         |
| ---------------------- | ----------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8080` | Base URL of the Java API (`src/lib/api.ts`)      |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical URLs, sitemap, robots                  |

The API must list the site origin in `APP_CORS_ALLOWED_ORIGINS`.

## Structure

```
src/
  app/[lang]/        routes /pt and /en (layout, page); robots.ts, sitemap.ts
  proxy.ts           redirects / to /pt or /en (cookie, then Accept-Language)
  i18n/              pt.ts / en.ts dictionaries — every visible string lives here
  components/
    three/           HeroVisual (picks 3D or fallback), RingsScene (R3F), RingsFallback (SVG)
    lab/             Engineering Lab: RequestFlow, LiveApi, SqlArchitecture, CodeShowcase
    contact/         ContactForm (POST /api/contact)
    sections/, projects/, ui/
  content/           site facts, offline project copy, SQL model, verbatim backend snippets
  lib/api.ts         typed API client (timeouts, ProblemDetail, contact result mapping)
  hooks/             useCan3D, useMediaQuery
  styles/tokens.css  design tokens (owned by the designer — do not edit here)
```

## Fallbacks

- **3D scene**: `RingsScene` is loaded with `next/dynamic({ ssr: false })`. `useCan3D` enables it only when WebGL is
  available, the device is not low-end (`hardwareConcurrency <= 2`) and `prefers-reduced-motion` is not set.
  Otherwise — and always during SSR — the static SVG `RingsFallback` is shown. The canvas caps `dpr` and stops
  rendering (`frameloop="never"`) when off-screen.
- **Projects**: fetched live from `GET /api/projects`; if the API fails, the bundled copy in `content/projects.ts` is
  shown with an explicit "offline copy" label.
- **Contact**: success is shown only after a 202. Server validation errors are mapped by field name to localized text;
  429 shows the `Retry-After` wait; 503 ("Contact delivery unavailable") offers e-mail/LinkedIn from
  `content/site.ts` — or, while those are `TODO(matheus)` placeholders, says the form is temporarily unavailable.
  413 and other statuses show a generic error. An empty `subject` is omitted from the request.
- **Engineering Lab**: the live call is a real `fetch` timed with `performance.now()`; network/CORS failures are shown
  with the browser's real error message.

## Backend snippets

`src/content/code-snippets.ts` holds excerpts copied verbatim from `../backend/src/main/java` with path and line
range. Re-sync them whenever those backend files change.
