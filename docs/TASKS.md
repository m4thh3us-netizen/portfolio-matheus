# Task Board & Decision Log

States: `todo | doing | review | done | blocked`

| ID | Task | Owner | Files | Depends on | Acceptance | State |
|---|---|---|---|---|---|---|
| T1 | Create 7 agents + validate frontmatter | orquestrador | `.claude/agents/` | — | 7 files, valid YAML, unique names | done |
| T2 | API contract | arquiteto (main session) | `docs/api/contracts.md` | T1 | 4 endpoints + error format | done |
| T3 | Design system | designer-ux-ui (main session) | `docs/design/` | T1 | tokens, type, motion, states | done |
| T4 | Spring Boot API + tests | backend-java (subagent) | `backend/` | T2 | `mvn test` green, curl smoke | done (40/40, re-run by orchestrator) |
| T4r | Backend architecture review | arquiteto | `docs/architecture/REVIEW-backend.md` | T4 | findings table | done (4 high, 4 medium, 12 low) |
| T4f | Fix review findings (ADR-002, A4 webhook sink) | backend-java | `backend/` | T4r | tests green, curl repro of A1/M1 fixed | done (89/89, re-run by orchestrator) |
| T5 | Next.js 3D frontend + i18n | frontend-3d (subagent) | `frontend/` | T2, T3 | tsc/lint/build green, /pt & /en | done |
| T6 | Re-sync Java snippets + 503 handling after hardening | frontend-3d | `frontend/src/content/code-snippets.ts`, `lib/api.ts`, ContactForm | T4f, T5 | snippets match backend files | done |
| T6b | Apply design review (P1–P3) + snippet sync script | frontend-3d | `frontend/` | T7a | gates green, focus rings visible | done (28/28) |
| T7a | Visual review of frontend | designer-ux-ui | `docs/design/REVIEW-frontend.md` | T5 | P1/P2/P3 list | done (5 P1, 11 P2, 12 P3) |
| T7 | Full QA run | qa-testes | `docs/qa/` | T6, T7a | QA report with real results | done — approve with reservations (QA-01/02 Média, QA-03 Baixa) |
| T8a | QA-01/02 perf + LCP, QA-03 frontend headers | frontend-3d | `frontend/` | T7 | Lighthouse re-measured | done (desktop 99–100; mobile 73–78 — QA-01 partial, QA-02 open) |
| T8b | QA-03 backend security headers | backend-java | `backend/` | T7 | tests green | done (95/95) |
| T8c | QA re-test of affected gates | qa-testes | `docs/qa/` | T8a, T8b | report updated | done — found QA-05 (Alta regression) + QA-04 |
| T9 | Fix QA-05 anchor nav + QA-04 SSR cards | frontend-3d | `frontend/` | T8c | nav lands under header | done |
| T9q | Independent verification of T9 | qa-testes | `docs/qa/` | T9 | 118/118 navigations | done — approve with reservations, no blockers |
| T10 | Mobile perf ≥ 85 / LCP ≤ 2.5 s (QA-01/02) | frontend-3d | `frontend/` | decision on mobile 3D | Lighthouse mobile | open — needs product decision |
| T9 | README + deploy docs | orquestrador | `README.md`, `docs/deploy.md` | T7 | install/run/deploy steps | done |

## Decision log
- 2026-11-19 — Custom agent types are only loaded at session start. Test delegation to `arquiteto` failed with "Agent type not found". Mitigation: delegate with real `general-purpose` subagents instructed to load the role file as operating instructions. After restart, use the named agents directly.
- 2026-11-19 — Named agent types became available mid-session. First real named delegation: `qa-testes` → `docs/qa/TEST_STRATEGY.md`.
- 2026-11-19 — Java 21 for backend (JDK used by Maven). See ADR-001.
- 2026-11-19 — No DB/auth in MVP. See ADR-001.
- 2026-11-19 — Contact delivery (review A4): webhook sink when `APP_CONTACT_WEBHOOK_URL` is set, otherwise logged; `APP_CONTACT_REQUIRE_DELIVERY=true` → 503. Final channel (webhook vs e-mail) is Matheus's decision.
- 2026-11-19 — 503 accepted into contract. Frontend omits empty `subject`; client-side localized messages are preferred over server English text (keyed by field).
- 2026-11-20 — QA's headless Chrome uses the real GPU (RTX 4060 Ti via ANGLE), not SwiftShader; T7's diagnosis corrected. Software-renderer fallback is verified by code review only.
- 2026-11-20 — Removed `content-visibility:auto` (caused QA-05 with ScrollTrigger.refresh); refreshes now wait for scroll idle.
- 2026-11-20 — QA browser scripts moved into `frontend/scripts/qa/`.
