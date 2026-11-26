# Deploy

## 1. Backend (Spring Boot) — Docker host (Render, Fly.io, Railway…)
```bash
cd backend
docker build -t portfolio-api .
docker run -p 8080:8080 -e APP_CORS_ALLOWED_ORIGINS=https://your-domain.com portfolio-api
```
Environment variables:
| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port (most PaaS inject it) |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowed frontend origins (set the production domain **and** the Vercel preview domain if needed) |
| `APP_CLIENT_IP_TRUSTED_HOPS` | `0` | Number of trusted proxies in front of the app; the client IP is the N-th `X-Forwarded-For` entry from the **right**. `0` = socket address (behind a PaaS proxy this makes **all visitors share one rate-limit bucket**). |
| `APP_CLIENT_IP_HEADER` | _(empty)_ | Unforgeable platform header with the client IP; takes precedence (e.g. `Fly-Client-IP`). |
| `APP_TRUST_PROXY` | `false` | **Deprecated** alias: `true` = `APP_CLIENT_IP_TRUSTED_HOPS=1` (startup WARN). Use the variable above. |
| `APP_CONTACT_WEBHOOK_URL` | _(empty)_ | **Secret.** Contact messages are POSTed here as JSON `{id, receivedAt, name, email, subject, message}`. Without it, messages are only written to the app log (masked e-mail). |
| `APP_CONTACT_WEBHOOK_TOKEN` | _(empty)_ | **Secret**, optional. Sent as `Authorization: Bearer …` to the webhook. |
| `APP_CONTACT_REQUIRE_DELIVERY` | `false` | Set `true` in production: without a webhook the contact endpoint answers 503 instead of only logging. |
| `APP_RATE_LIMIT_MAX_TRACKED_KEYS` | `10000` | Memory cap for the in-memory rate limiter (new clients get 429 when full). |

Client IP per platform (confirm after the first deploy: enable `logging.level.dev.matheusspindola.portfolio.config.ClientIpResolver=DEBUG`, which logs `remoteAddr` + `X-Forwarded-For` once, then check the startup line `Client IP resolution: ...`):
| Platform | Setting |
|---|---|
| Fly.io | `APP_CLIENT_IP_HEADER=Fly-Client-IP` |
| Render | `APP_CLIENT_IP_TRUSTED_HOPS=1` (to confirm empirically) |
| Railway | `APP_CLIENT_IP_TRUSTED_HOPS=1` (to confirm empirically) |
| Local / direct | leave both unset |

Render example: New → Web Service → repo root dir `backend` → Runtime Docker → health check path `/api/health`.

## 2. Frontend (Next.js) — Vercel
- Import the repo, **Root Directory = `frontend`**, framework Next.js.
- Env vars: `NEXT_PUBLIC_API_URL=https://<your-api-host>` and `NEXT_PUBLIC_SITE_URL=https://<your-domain>`.
- Redeploy after changing `NEXT_PUBLIC_*` (they're inlined at build time).

## 3. Post-deploy checks
```bash
curl https://<api>/api/health
curl -i -X OPTIONS https://<api>/api/projects -H "Origin: https://<your-domain>" -H "Access-Control-Request-Method: GET"
```
Open `/pt` and `/en`, run the Engineering Lab "Live Java API" request, submit the contact form once.

## Notes
- Free tiers sleep: the first API call can take ~30–60 s; the site shows an offline copy of projects meanwhile and the Lab shows the real latency.
- Contact delivery: set `APP_CONTACT_WEBHOOK_URL` (and `APP_CONTACT_REQUIRE_DELIVERY=true`) before going public. Without a webhook, messages only appear in the platform logs (startup WARN "contact messages are only logged"), with the sender's e-mail masked.
