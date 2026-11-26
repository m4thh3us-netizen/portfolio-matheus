# portfolio-api

Spring Boot 3.5 / Java 21 REST API for the portfolio. Contract: [`../docs/api/contracts.md`](../docs/api/contracts.md).

## Requirements
- JDK 21
- Maven 3.9+

## Run
```bash
mvn spring-boot:run
# or
mvn -B -DskipTests package && java -jar target/portfolio-api.jar
```
The API listens on `http://localhost:8080` (override with `PORT`).

## Test
```bash
mvn -B test
```

## Docker
```bash
docker build -t portfolio-api .
docker run --rm -p 8080:8080 -e APP_CORS_ALLOWED_ORIGINS=http://localhost:3000 portfolio-api
```
The runtime image runs as a non-root `app` user, from a layered (extracted) jar so code changes only re-ship the
small application layer. Base images are pinned (`maven:3.9.11-eclipse-temurin-21`, `eclipse-temurin:21.0.8_9-jre`);
JVM flags are tuned for 256-512 MB containers (`-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k -XX:+ExitOnOutOfMemoryError`).

## Environment variables
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed CORS origins |
| `APP_CLIENT_IP_TRUSTED_HOPS` | `0` | Number of trusted reverse proxies in front of the app. `0` = socket address; `N` = N-th `X-Forwarded-For` entry counted from the **right** (the left-most entries are client-controlled and never trusted). `APP_TRUSTED_PROXY_HOPS` (ADR-002 name) is accepted as an alias. |
| `APP_CLIENT_IP_HEADER` | _(empty)_ | Platform header the client cannot forge, e.g. `Fly-Client-IP` on Fly.io. Takes precedence when present and a valid IP. |
| `APP_TRUST_PROXY` | `false` | **Deprecated.** `true` = `APP_CLIENT_IP_TRUSTED_HOPS=1`, with a startup WARN. Will be removed. |
| `APP_CONTACT_WEBHOOK_URL` | _(empty)_ | If set, contact messages are POSTed to this http(s) URL (see below). Treat it as a secret. |
| `APP_CONTACT_WEBHOOK_TOKEN` | _(empty)_ | Optional; sent as `Authorization: Bearer <token>` to the webhook. |
| `APP_CONTACT_REQUIRE_DELIVERY` | `false` | `true` + no webhook → `POST /api/contact` answers **503** instead of only logging. Recommended in production. |
| `APP_RATE_LIMIT_MAX_TRACKED_KEYS` | `10000` | Max distinct clients tracked by the in-memory limiter (`app.contact.rate-limit.max-tracked-keys`). |

The effective IP resolution mode and the delivery mode are logged once at startup.
Other tunables live in `src/main/resources/application.yml` under `app.*`
(`app.contact.min-fill-time`, `app.contact.rate-limit.max-requests`, `app.contact.rate-limit.window`,
`app.contact.webhook.timeout` (5 s), `app.max-body-bytes`).

## Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{status, service, version, timestamp}` |
| GET | `/api/projects?lang=pt\|en` | Project summaries ordered by `order` (unknown `lang` → `pt`) |
| GET | `/api/projects/{id}?lang=pt\|en` | Project detail, 404 ProblemDetail if unknown |
| POST | `/api/contact` | Contact form; 202 on delivery, 400 validation/spam/malformed, 413 too large, 429 rate limited (`Retry-After`), 503 delivery unavailable |
| GET | `/v3/api-docs` | OpenAPI JSON |
| GET | `/swagger-ui.html` | Swagger UI |
| GET | `/actuator/health` | Actuator health (only exposed actuator endpoint) |

All errors produced by the application are RFC 9457 `application/problem+json`. CORS is applied by a
highest-precedence `CorsFilter`, so 413/429 responses also carry `Access-Control-Allow-Origin`.

## Contact pipeline
1. **Body limit** (`RequestSizeLimitFilter`, all `/api/**`): bodies over 16 KB → 413, with or without
   `Content-Length` (chunked bodies are read up to 16 KB + 1 byte, then rejected or replayed).
2. **Rate limit** (`ContactRateLimitInterceptor`, before the body is parsed): 5 attempts / 10 min per client
   IP (IPv6: per /64). Every POST counts, including malformed JSON, wrong `Content-Type`, invalid and spam submissions.
   Memory is capped (`max-tracked-keys`); when full, new clients get 429 until entries expire (fail closed).
3. **Bean Validation** (`@Valid`; fields are stripped first, so `"  A  "` fails `min=2`). Field-level `errors` map on failure.
4. **Anti-spam**: honeypot `website` must be empty; at least 3 s between `startedAt` and submission.
   Failure → generic 400 "Submission rejected" (no hint of which check failed).
5. **Delivery** via the `ContactSink` port. **202 is returned only after the sink succeeded.**

### Delivery modes
| Configuration | Sink | Behaviour |
|---|---|---|
| `APP_CONTACT_WEBHOOK_URL` set | `WebhookContactSink` | `POST` JSON `{id, receivedAt, name, email, subject, message}` (+ `Authorization: Bearer …` if a token is set), 5 s connect/read timeout, redirects not followed. Non-2xx, timeout or I/O error → **503** `"Contact delivery unavailable"` (never 202). |
| no URL, `APP_CONTACT_REQUIRE_DELIVERY=true` | `UnavailableContactSink` | Every valid submission → **503**; the frontend should offer e-mail/LinkedIn instead. |
| no URL (default) | `LoggingContactSink` | Startup WARN "contact messages are only logged". Each message is logged as one line: id, name (sanitized), **masked** e-mail, subject and message (escaped: CR/LF/U+2028/U+2029 cannot forge log lines; truncated). Read them in the platform log viewer. Note: the sender's full e-mail is *not* logged, so you can only reply if they included contact details in the message. Use a webhook in production. |

The webhook payload is generic JSON, suitable for an automation endpoint (n8n, Make, Zapier, Pipedream, a serverless
function that sends e-mail, etc.). Services that require their own body shape (e.g. Discord's `{"content": …}`)
need such a relay in between. The webhook URL and token are never logged.

Rate-limit state is per process and resets on restart; use a shared store if the API is ever scaled horizontally.

## Project data
`src/main/resources/data/projects.json` holds the catalog with `pt`/`en` texts. Only verified facts from
`docs/content/profile.md` belong there; unconfirmed details are marked as pending and `verified` is `false`.
