# API Contracts — v1

Single source of truth for the frontend ↔ backend interface. Owner: `arquiteto`.
Base URL: `NEXT_PUBLIC_API_URL` (dev: `http://localhost:8080`). All bodies are JSON (UTF-8).

## Error format (all endpoints)
RFC 9457 `ProblemDetail` (`Content-Type: application/problem+json`):
```json
{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/api/contact",
  "errors": { "email": "must be a well-formed email address" }
}
```
`errors` is present only for validation failures (400). Statuses used: 400, 404, 413, 429, 500, 503; framework-generated 405 (wrong method) and 415 (wrong `Content-Type`) use the same ProblemDetail shape with default titles ("Method Not Allowed", "Unsupported Media Type").

---

## GET /api/health
200:
```json
{ "status": "UP", "service": "portfolio-api", "version": "1.0.0", "timestamp": "2026-11-19T20:00:00Z" }
```

## GET /api/projects?lang=pt|en
`lang` optional, default `pt`; unknown values fall back to `pt`.
200 — array of `ProjectSummary`, ordered by `order` ascending:
```json
[
  {
    "id": "mfy",
    "title": "MFY — Finanças Pessoais",
    "summary": "Sistema web de organização financeira...",
    "status": "PUBLISHED",
    "category": "Web App",
    "technologies": [],
    "liveUrl": "https://mfy-xi.vercel.app/",
    "repoUrl": null,
    "verified": true
  }
]
```
`status` ∈ `PUBLISHED | ACADEMIC | IN_PROGRESS | STUDY`.
`technologies` lists only confirmed technologies (may be empty → UI shows "stack a confirmar").
`verified` = details were confirmed by Matheus; `false` → UI shows a "details pending confirmation" badge.

## GET /api/projects/{id}?lang=pt|en
200 — `ProjectDetail` = `ProjectSummary` + `description` (string) + `highlights` (string[]).
404 — ProblemDetail, `title: "Project not found"`.

## POST /api/contact
Request:
```json
{
  "name": "Ana Souza",            // required, 2..80 chars
  "email": "ana@example.com",     // required, valid email, ≤ 120
  "subject": "Oportunidade",      // optional, ≤ 120
  "message": "Olá Matheus...",    // required, 10..2000 chars
  "website": "",                  // honeypot — must be empty
  "startedAt": 1732046400000      // epoch ms when form was rendered
}
```
Responses:
- **202** `{ "status": "RECEIVED", "id": "c0a8...uuid", "receivedAt": "..." }` — only after the message was handed to the `ContactSink`.
- **400** validation ProblemDetail (with `errors`).
- **422**-like spam cases are reported as **400** with `title: "Submission rejected"` (honeypot filled or submitted < 3 s after `startedAt`) — no hint of which check failed.
- **429** `title: "Too many requests"` — more than 5 submissions per IP per 10 minutes. Header `Retry-After` (seconds). Every POST attempt counts, including ones later rejected as invalid or spam (the limiter runs first, so it cannot be bypassed with bad payloads).
- **503** `title: "Contact delivery unavailable"` — delivery failed or is required but not configured; never 202. Frontend shows e-mail/LinkedIn fallback.
- Oversized bodies: 400 (field length validation) or 413 if the server limit is hit — never 500 or 202.

### Contact — implementation notes (v1.0.0)
- `startedAt` is **required** (missing → `errors.startedAt`).
- Bodies larger than 16 KB → **413** `title: "Payload too large"` (`app.max-body-bytes`). The limit applies whether or not `Content-Length` is sent (chunked bodies included). 413 responses carry CORS headers.
- "Every attempt counts" includes malformed JSON, wrong `Content-Type` (415), invalid fields and spam: the limiter runs in a `HandlerInterceptor` before the body is parsed, so a blocked client gets 429, not 400. (413 is decided earlier, in a servlet filter, and does not consume a slot.)
- Client IP for rate limiting is resolved per ADR-002 (`APP_CLIENT_IP_TRUSTED_HOPS`, counted from the right of `X-Forwarded-For`, or `APP_CLIENT_IP_HEADER`); values that are not IP literals fall back to the socket address. IPv6 clients are keyed by their /64. The left-most `X-Forwarded-For` entry is never trusted. The limiter tracks at most 10 000 clients; when full, new clients get 429 (fail closed).
- **503** `title: "Contact delivery unavailable"` — the message could not be delivered (webhook non-2xx/timeout/error, or `APP_CONTACT_REQUIRE_DELIVERY=true` without a webhook). Never 202 in that case; the frontend should offer e-mail/LinkedIn as fallback. *Accepted into the Responses list (orchestrator, 2026-11-19).*
- Text fields are trimmed **before** validation (`"  A  "` fails `name` min length). A blank `subject` is delivered as `null`.
- `email` must also contain a dot in the domain (`ana@localhost` → `errors.email`, same default message).
- The honeypot `website` has no field-level constraint: any non-blank value → "Submission rejected", never `errors.website`.
- Validation messages are always English; the frontend maps them to localized text **by field name**.
- `category` in project payloads is localized (e.g. "Aplicação Web" / "Web App").
- Clock skew: a client clock ahead of the server by more than the fill time is rejected as "Submission rejected". Accepted risk (honeypot is the primary guard).

## Docs
OpenAPI JSON `/v3/api-docs`, UI `/swagger-ui.html`.

## Response security headers
All responses: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`. API responses also carry `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` (Swagger UI / `/v3/api-docs` excluded). `POST /api/contact` responses: `Cache-Control: no-store`.

## CORS
Allowed origins from `APP_CORS_ALLOWED_ORIGINS` (comma-separated; default `http://localhost:3000`). Methods `GET, POST, OPTIONS`.
