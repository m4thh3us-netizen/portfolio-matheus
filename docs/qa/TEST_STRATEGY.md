# Test Strategy — Portfólio Matheus Lopes Spíndola

Owner: `qa-testes`. Status: **plan only (phase 6)**. Nothing here has been executed yet; results go to `docs/qa/QA_REPORT.md` with the real command output.

Sources of truth: `CLAUDE.md`, `docs/api/contracts.md`, `docs/design/design-system.md`, `docs/content/profile.md`.

Golden rule: an item is "passed" only when the command was run and its real (summarised) output is pasted in the report. Lighthouse numbers are recorded as measured, never estimated.

---

## 1. Acceptance criteria per feature

### F1 — `GET /api/health`
- AC1.1 Returns **200**, `Content-Type: application/json`.
- AC1.2 Body has exactly the keys `status`, `service`, `version`, `timestamp`; `status == "UP"`, `service == "portfolio-api"`, `version` non-empty, `timestamp` ISO-8601 UTC (ends with `Z`).
- AC1.3 Unknown path (`/api/nope`) returns **404** as `application/problem+json`.

### F2 — `GET /api/projects?lang=pt|en`
- AC2.1 **200**, JSON array of 7 `ProjectSummary` (ids from `profile.md`: `mfy, ecommerce-management, tutoring-platform, projeto-horizonte, oracle-modeling, nfe-integration, portfolio`), ordered by `order` ascending.
- AC2.2 Every item has `id, title, summary, status, category, technologies, liveUrl, repoUrl, verified` (no extra internal fields such as `order` unless contract is updated).
- AC2.3 `status` ∈ `PUBLISHED | ACADEMIC | IN_PROGRESS | STUDY` and matches `profile.md` (mfy=PUBLISHED, portfolio=IN_PROGRESS, oracle-modeling/nfe-integration=STUDY, others ACADEMIC).
- AC2.4 `technologies` contains **only** confirmed tech from `profile.md` (empty for mfy, ecommerce-management, tutoring-platform, projeto-horizonte; `["SQL","Oracle Database"]` for oracle-modeling; `["Angular"]` for nfe-integration; `Java, Spring Boot, TypeScript, React, Next.js` for portfolio).
- AC2.5 `liveUrl` only for mfy (`https://mfy-xi.vercel.app/`); `repoUrl` is `null` everywhere (repos are `TODO(matheus)`). No invented URLs.
- AC2.6 `lang=en` returns English titles/summaries; `lang=pt` and missing `lang` return Portuguese; **unknown `lang` (e.g. `fr`, `PT-br`, empty) falls back to `pt` with 200** (never 400).
- AC2.7 Language-independent fields (`id, status, technologies, liveUrl, repoUrl, verified`) are identical between `pt` and `en`.

### F3 — `GET /api/projects/{id}?lang=pt|en`
- AC3.1 Known id → **200**, `ProjectSummary` fields + `description` (string, non-empty) + `highlights` (string[]).
- AC3.2 Unknown id → **404**, `application/problem+json`, `title == "Project not found"`, `status == 404`, `instance` = request path.
- AC3.3 Same `lang` fallback rules as F2.
- AC3.4 Descriptions/highlights contain no facts beyond `profile.md` (manual review).

### F4 — `POST /api/contact`
- AC4.1 Valid payload (honeypot empty, `startedAt` ≥ 3 s ago) → **202** `{status:"RECEIVED", id:<uuid>, receivedAt:<ISO>}`.
- AC4.2 Validation → **400** ProblemDetail with `errors` map keyed by field: `name` missing / <2 / >80; `email` missing / invalid / >120; `subject` >120; `message` missing / <10 / >2000.
- AC4.3 Malformed JSON body → **400** ProblemDetail (not 500, no stack trace).
- AC4.4 Honeypot `website` non-empty → **400** `title == "Submission rejected"`, **no** `errors` field and no hint of which check failed.
- AC4.5 Too fast (`startedAt` < 3 s ago, also future/missing `startedAt`) → **400** `title == "Submission rejected"`, body indistinguishable from AC4.4 except `instance`.
- AC4.6 Rate limit: the 6th submission from the same IP within 10 min → **429** `title == "Too many requests"` with `Retry-After` header (integer seconds > 0).
- AC4.7 Oversized payload (e.g. 1 MB body) → rejected with 4xx (400/413), never 500, never accepted.
- AC4.8 Wrong content type (`text/plain`) → **415** or 400 ProblemDetail, not 500.
- AC4.9 `GET /api/contact` → 405, not 500.
- AC4.10 202 only after `ContactSink` received the message (verify via backend test / log line, no e-mail secrets in logs).

### F5 — CORS
- AC5.1 Preflight `OPTIONS` from `Origin: http://localhost:3000` → 200 with `Access-Control-Allow-Origin: http://localhost:3000` and methods including `GET, POST`.
- AC5.2 Preflight/request from a non-allowed origin (`http://evil.example`) → no `Access-Control-Allow-Origin` header (Spring returns 403 on preflight).
- AC5.3 No wildcard `*` combined with credentials; origins configurable via `APP_CORS_ALLOWED_ORIGINS`.

### F6 — i18n `/pt` and `/en` parity
- AC6.1 `GET /pt` and `GET /en` → 200; `/` redirects (307/308) to a locale; unknown locale (`/fr`) → 404 or redirect, never 500.
- AC6.2 `frontend/src/i18n/pt.ts` and `en.ts` have **identical key sets** (deep compare, script in §2.4).
- AC6.3 No hard-coded visible strings in components (grep check); every section renders in both locales.
- AC6.4 `<html lang>` is `pt-BR` on `/pt` and `en` / `en-US` on `/en`; language switcher keeps the current section.
- AC6.5 Bio and headline match `profile.md` verbatim in each language.

### F7 — Hero 3D + fallbacks
- AC7.1 With WebGL available, the rings canvas renders; text is readable (contrast ≥ 4.5:1 over the scene on mobile at 45% opacity).
- AC7.2 Without WebGL (Chrome `--disable-webgl` or forced context failure), a static fallback (gradient/SVG/image) renders, no console errors that break the page, no blank area.
- AC7.3 `prefers-reduced-motion: reduce` → no 3D animation loop movement, no GSAP transforms, instant reveals (DevTools > Rendering > Emulate CSS media feature).
- AC7.4 3D bundle is lazy-loaded/client-only (does not block first paint; `next build` output shows it out of the main route chunk where possible).
- AC7.5 Hero intro animation ≤ 1.4 s.

### F8 — Engineering Lab (live request honesty)
- AC8.1 Requests go to the real API at `NEXT_PUBLIC_API_URL` (visible in DevTools Network), not mocked data.
- AC8.2 Displayed status code, latency and response body are the **actual** values from the response (compare with Network tab / curl).
- AC8.3 API offline → explicit "API offline/unavailable" state; no fake success, no fabricated JSON, no infinite spinner (timeout ≤ ~10 s).
- AC8.4 Error responses (404 for unknown project) are shown as errors with the real ProblemDetail.

### F9 — Contact form states
- AC9.1 States: idle → submitting (button disabled, spinner, "Enviando…"/"Sending…") → success (202) / validation error (400 with field messages) / rejected (400 generic) / rate limited (429, mentions wait time) / network error (API down).
- AC9.2 Field errors linked via `aria-describedby`, `aria-invalid="true"`; focus moves to first invalid field or to a status region (`role="status"`/`aria-live`).
- AC9.3 Client validation mirrors the contract limits (2..80, ≤120, 10..2000) but server is authoritative.
- AC9.4 Honeypot field hidden from users and assistive tech (`aria-hidden`, `tabindex=-1`, `autocomplete="off"`), not `display:none`-only if the design chose otherwise — documented.
- AC9.5 `startedAt` set at render time; double submit prevented.
- AC9.6 Copy in both languages.

### F10 — Placeholders not rendered as broken links
- AC10.1 GitHub, LinkedIn, e-mail, résumé PDF, repos, screenshots, experience: when `TODO(matheus)`, UI shows "em breve"/"coming soon" (non-link or disabled element), **never** `href="#"`, `href=""`, `href="TODO..."` or a 404.
- AC10.2 The literal text `TODO(matheus)` is not visible in the rendered page.
- AC10.3 Every external `href` in built HTML is reachable (2xx/3xx) and uses `rel="noopener noreferrer"` with `target="_blank"`.
- AC10.4 No skill percentage bars, no invented experience, employers, metrics or tech.

---

## 2. Gate commands

All commands from the project root `C:/Users/PC-HOME/Documents/Portifolio_Matheus` in Git Bash. Each gate's real output is pasted (summarised) in `QA_REPORT.md`.

### 2.1 Backend gate
```bash
cd backend && mvn -B -q test          # expected: BUILD SUCCESS, 0 failures, 0 errors
cd backend && mvn -B test | grep -E "Tests run:|BUILD"   # record counts
cd backend && mvn spring-boot:run     # in background; wait for "Started" then run §2.2
```

### 2.2 API smoke (http://localhost:8080)
Helper: `S='-s -o /dev/stdout -w "\nHTTP %{http_code}\n"'` — or simply use `-i` to see status and headers.

```bash
# Health — expect 200, {"status":"UP","service":"portfolio-api",...}
curl -i http://localhost:8080/api/health

# Unknown route — expect 404 application/problem+json
curl -i http://localhost:8080/api/nope

# Projects list — expect 200, array of 7, Portuguese
curl -i "http://localhost:8080/api/projects"
curl -i "http://localhost:8080/api/projects?lang=pt"
# expect 200, English titles
curl -i "http://localhost:8080/api/projects?lang=en"
# fallback — expect 200, same body as lang=pt
curl -i "http://localhost:8080/api/projects?lang=fr"
curl -i "http://localhost:8080/api/projects?lang="
diff <(curl -s "http://localhost:8080/api/projects?lang=fr") <(curl -s "http://localhost:8080/api/projects?lang=pt") && echo "fallback OK"

# Count and order (needs jq or python)
curl -s "http://localhost:8080/api/projects?lang=en" | python -c "import sys,json;d=json.load(sys.stdin);print(len(d),[p['id'] for p in d])"

# Detail — expect 200 with description + highlights
curl -i "http://localhost:8080/api/projects/mfy?lang=en"
curl -i "http://localhost:8080/api/projects/oracle-modeling?lang=xx"   # expect 200, pt fallback
# Not found — expect 404, "title":"Project not found"
curl -i "http://localhost:8080/api/projects/does-not-exist"

# OpenAPI — expect 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/v3/api-docs
curl -s -o /dev/null -w "%{http_code}\n" -L http://localhost:8080/swagger-ui.html
```

**Contact** — run in this order, against a freshly started API (the rate-limit bucket counts per IP; tests below consume it). `NOW` = epoch ms.

```bash
NOW=$(date +%s%3N); OLD=$((NOW-10000)); FAST=$((NOW-500))

# 1. Valid — expect 202 {"status":"RECEIVED","id":"<uuid>","receivedAt":"..."}
curl -i -X POST http://localhost:8080/api/contact -H "Content-Type: application/json" \
  -d "{\"name\":\"Ana Souza\",\"email\":\"ana@example.com\",\"subject\":\"Teste QA\",\"message\":\"Mensagem de teste do QA.\",\"website\":\"\",\"startedAt\":$OLD}"

# 2. Validation — expect 400, "errors" has name, email, message
curl -i -X POST http://localhost:8080/api/contact -H "Content-Type: application/json" \
  -d "{\"name\":\"A\",\"email\":\"not-an-email\",\"message\":\"curta\",\"website\":\"\",\"startedAt\":$OLD}"

# 3. Honeypot — expect 400 "title":"Submission rejected", no "errors"
curl -i -X POST http://localhost:8080/api/contact -H "Content-Type: application/json" \
  -d "{\"name\":\"Bot Name\",\"email\":\"bot@example.com\",\"message\":\"Mensagem de spam aqui.\",\"website\":\"http://spam\",\"startedAt\":$OLD}"

# 4. Too fast — expect 400 "title":"Submission rejected", body same shape as #3
curl -i -X POST http://localhost:8080/api/contact -H "Content-Type: application/json" \
  -d "{\"name\":\"Ana Souza\",\"email\":\"ana@example.com\",\"message\":\"Mensagem rápida demais.\",\"website\":\"\",\"startedAt\":$FAST}"

# 5. Malformed JSON — expect 400 ProblemDetail, no stack trace
curl -i -X POST http://localhost:8080/api/contact -H "Content-Type: application/json" -d '{"name":'

# 6. Wrong content type — expect 415 (or 400), not 500
curl -i -X POST http://localhost:8080/api/contact -H "Content-Type: text/plain" -d 'hello'

# 7. Wrong method — expect 405
curl -i http://localhost:8080/api/contact

# 8. Oversized payload (~1 MB message) — expect 400/413, never 202/500
python -c "import json,time;print(json.dumps({'name':'Ana Souza','email':'ana@example.com','message':'x'*1000000,'website':'','startedAt':int(time.time()*1000)-10000}))" > "$TMP/big.json"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/contact -H "Content-Type: application/json" --data-binary @"$TMP/big.json"

# 9. Rate limit — loop valid submissions; expect 202 until the 5th accepted, then 429 with Retry-After
for i in 1 2 3 4 5 6 7; do
  curl -s -o /dev/null -D - -X POST http://localhost:8080/api/contact -H "Content-Type: application/json" \
    -d "{\"name\":\"Rate Test\",\"email\":\"rate@example.com\",\"message\":\"Teste de rate limit $i.\",\"website\":\"\",\"startedAt\":$OLD}" \
    | grep -iE "^HTTP|^Retry-After"
done
curl -i -X POST http://localhost:8080/api/contact -H "Content-Type: application/json" \
  -d "{\"name\":\"Rate Test\",\"email\":\"rate@example.com\",\"message\":\"Depois do limite.\",\"website\":\"\",\"startedAt\":$OLD}"
# expect 429, "title":"Too many requests", header Retry-After: <seconds>
```
Open question to record (not a failure until the contract is clarified): do rejected (400) submissions count toward the 5/10 min limit? Record observed behaviour; restart the API before step 9 if needed for a clean count.

**CORS**
```bash
# Allowed origin preflight — expect 200 + Access-Control-Allow-Origin: http://localhost:3000
curl -i -X OPTIONS http://localhost:8080/api/contact \
  -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
# Simple GET with allowed origin — expect ACAO header present
curl -s -D - -o /dev/null http://localhost:8080/api/projects -H "Origin: http://localhost:3000" | grep -i access-control
# Disallowed origin — expect 403 on preflight and NO Access-Control-Allow-Origin
curl -i -X OPTIONS http://localhost:8080/api/contact \
  -H "Origin: http://evil.example" -H "Access-Control-Request-Method: POST"
```

**Security quick checks**
```bash
grep -rniE "password|secret|api[_-]?key|token" backend/src/main frontend/src --include=*.{java,properties,yml,yaml,ts,tsx} | grep -v test
ls frontend/.env* backend/.env* 2>/dev/null; grep -n "\.env" .gitignore frontend/.gitignore 2>/dev/null
curl -s http://localhost:8080/actuator | head -c 400; echo   # only health/info exposed
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/actuator/env   # expect 404
```

### 2.3 Frontend gate
```bash
cd frontend && npm ci            # or npm install if no lockfile
cd frontend && npx tsc --noEmit  # expect: no output, exit 0
cd frontend && npm run lint      # expect: no errors (warnings listed in report)
cd frontend && npm run build     # expect: "Compiled successfully", /[locale] routes generated; record First Load JS sizes
grep -rn ": any\|as any\|<any>" frontend/src   # expect: nothing
```

### 2.4 Frontend smoke (http://localhost:3000)
Run `cd frontend && npm run start` (after build) with the API running on :8080.
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/pt        # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/en        # 200
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/   # 307/308 -> /pt or /en
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/fr        # 404 (or redirect), not 500
curl -s http://localhost:3000/pt | grep -o '<html[^>]*lang="[^"]*"'      # lang="pt-BR"
curl -s http://localhost:3000/en | grep -o '<html[^>]*lang="[^"]*"'      # lang="en..."
curl -s http://localhost:3000/pt | grep -c "Engenharia além do que se vê"   # >= 1
curl -s http://localhost:3000/en | grep -c "Engineering beyond the visible" # >= 1
# Placeholder leaks — expect 0 for each
for L in pt en; do curl -s http://localhost:3000/$L | grep -cE 'TODO|href="#"|href=""'; done
# External links list — then check each returns 2xx/3xx
curl -s http://localhost:3000/en | grep -oE 'href="https?://[^"]+"' | sort -u
curl -s -o /dev/null -w "%{http_code}\n" -L https://mfy-xi.vercel.app/
```

i18n key parity (no build needed, run with Node):
```bash
cd frontend && npx tsx -e "import {pt} from './src/i18n/pt'; import {en} from './src/i18n/en';
const k=(o:any,p=''):string[]=>Object.entries(o).flatMap(([x,v])=>v&&typeof v==='object'&&!Array.isArray(v)?k(v,p+x+'.'):[p+x]);
const a=new Set(k(pt)),b=new Set(k(en));
console.log('only pt:',[...a].filter(x=>!b.has(x)));console.log('only en:',[...b].filter(x=>!a.has(x)));"
```
(Adjust export names to the actual module; expected output: two empty arrays. Script lives only in the shell, not in the repo.)

### 2.5 Contract comparison
```bash
grep -n "interface\|type " frontend/src/lib/api.ts
grep -rn "record " backend/src/main/java
```
Compare field-by-field with `docs/api/contracts.md`: names, nullability (`repoUrl: string | null`, `liveUrl: string | null`), enum values of `status`, `ProblemDetail.errors?: Record<string,string>`, `ContactRequest.startedAt: number`, `ContactResponse`. Any divergence = failure owned by whoever deviated from the contract.

### 2.6 Browser checks (manual, Chrome DevTools)
- Engineering Lab: Network tab vs on-screen status/latency/body; then stop the API and retry → offline state.
- Contact form: trigger each state in AC9.1 (429 via repeated submits; network error with API stopped).
- WebGL off: launch Chrome with `--disable-webgl --disable-3d-apis` → fallback visible.
- Reduced motion: DevTools > Rendering > `prefers-reduced-motion: reduce`.

---

## 3. Accessibility & performance checklist

### Accessibility
- [ ] Landmarks: one `<header>`, one `<main>`, `<nav>` with `aria-label`, `<footer>`; skip link "Pular para o conteúdo"/"Skip to content" as first focusable.
- [ ] Headings: exactly one `h1` per page (hero); sections use `h2`, cards `h3`; no skipped levels (axe / HeadingsMap).
- [ ] All inputs have `<label for>`; required fields marked; errors via `aria-describedby` + `aria-invalid`; status via `aria-live="polite"`.
- [ ] Focus-visible: 2px `#B7E4FF` outline, 3px offset on every interactive element (tab through the whole page in both locales).
- [ ] Keyboard: full navigation without traps (canvas not focusable unless interactive); language switcher and mobile menu operable with Enter/Space/Esc.
- [ ] `prefers-reduced-motion: reduce` honoured (3D loop paused, GSAP disabled, reveals instant).
- [ ] Canvas has `aria-hidden="true"` or a text alternative; decorative visuals hidden from AT.
- [ ] Contrast: text ≥ 4.5:1, large text/UI ≥ 3:1 — especially `--text-2` on glass panels and text over the 3D rings on mobile; badge colors on `--bg-2`.
- [ ] `lang` attribute correct per locale; language switch links have `hreflang`.
- [ ] Images have meaningful `alt` or `alt=""` if decorative; no information conveyed by color only (status badges carry text).
- [ ] Zoom 200% / 320 px width: no horizontal scroll, no clipped content.
- Tool: `npx @axe-core/cli http://localhost:3000/pt http://localhost:3000/en` (if available) — record violations count.

### Performance (Lighthouse — targets are goals; record real measured values only)
| Metric | Goal (mobile) | Goal (desktop) |
|---|---|---|
| Performance | ≥ 85 | ≥ 95 |
| Accessibility | ≥ 95 | ≥ 95 |
| Best Practices | ≥ 95 | ≥ 95 |
| SEO | ≥ 95 | ≥ 95 |
| LCP | ≤ 2.5 s | ≤ 1.5 s |
| CLS | ≤ 0.1 | ≤ 0.1 |
| TBT | ≤ 300 ms | ≤ 150 ms |

Command (production build via `npm run start`, not `dev`):
```bash
npx lighthouse http://localhost:3000/pt --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="$TMP/lh-pt.json" --chrome-flags="--headless=new"
npx lighthouse http://localhost:3000/en --preset=desktop --output=json --output-path="$TMP/lh-en-desktop.json" --chrome-flags="--headless=new"
```
If Lighthouse/Chrome is unavailable: mark "não executável neste ambiente" with the reason. Additional checks: 3D chunk lazy-loaded (`next build` route table), fonts via `next/font` (no layout shift), no WebGL work when the hero is off-screen, `dpr` capped (≤ 2).

---

## 4. Execution order (phase 7 / T7)
1. §2.1 backend gate → 2. §2.2 API smoke (fresh API for contact/rate limit) → 3. §2.3 frontend gate → 4. §2.5 contract → 5. §2.4 smoke + i18n parity → 6. §2.6 browser checks → 7. §3 a11y/perf → 8. log failures in `QA_REPORT.md`, recommend approve / reject.

Severity scale: **Bloqueante** (gate fails, data invented, security hole, broken core flow) · **Alta** (AC violated in a visible feature) · **Média** (a11y/perf goal missed, minor contract drift) · **Baixa** (cosmetic).
