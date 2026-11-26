# ADR-001 — Stack, boundaries and MVP scope

- Status: Accepted · Date: 2026-11-19 · Owner: arquiteto

## Context
The portfolio must showcase backend (Java) skills while offering a premium 3D experience. It is maintained by one student, so operational cost and complexity must stay low.

## Decision
1. **Two deployables in one repo**: `frontend/` (Next.js, static-friendly, deploy to Vercel) and `backend/` (Spring Boot jar in a Docker image, deploy to Render/Fly.io/Railway).
2. **Java 21 LTS + Spring Boot 3.5** (Java 21 is the JDK Maven uses on the dev machine; Java 25 LTS is also installed and can be adopted later).
3. **No database in the MVP.** The project catalog is a versioned `projects.json` on the classpath behind a `ProjectCatalog` component — swapping to JPA later only changes that layer. The SQL section in the Engineering Lab is explicitly a *demonstrative* model.
4. **No authentication.** Only public read endpoints plus a rate-limited contact endpoint.
5. **Contact delivery** through a `ContactSink` port. Default implementation logs (with masked e-mail); an SMTP sink can be added by env vars without changing the controller.
6. **Spam/abuse**: honeypot field + minimum fill time + in-memory per-IP sliding window (5 / 10 min). Adequate for a single instance; a shared store (Redis) would be needed if scaled horizontally.
7. **Errors** follow RFC 9457 `ProblemDetail`.
8. **Frontend resilience**: if the API is down (e.g. free-tier cold start), project cards fall back to a bundled copy *labeled as offline*; the Engineering Lab shows the real error, never a fake response.

## Consequences
+ Cheap to host, fast to test, easy to reason about.
− Contact messages are only logged until a real sink (SMTP) is configured.
− Rate limiting resets on restart and isn't shared across instances.
