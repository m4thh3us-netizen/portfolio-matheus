# Browser QA scripts

Regression scripts used by the `qa-testes` agent (see `docs/qa/QA_REPORT.md`). They drive Chrome over the DevTools protocol and need no extra dependencies (Node 22+ global `fetch`/`WebSocket`).

Prerequisites:
```bash
npm run build && npm run start                      # site on :3000
java -jar ../backend/target/portfolio-api.jar        # API on :8080 (optional for nav/reveal)
chrome --headless=new --remote-debugging-port=9333 --user-data-dir=<temp dir>
```

| Script | Checks |
|---|---|
| `qa_nav.mjs <base> <widths> <delays> [hash]` | Header anchor navigation lands the section just below the header (desktop clicks, mobile taps, early/late clicks). Regression test for QA-05. |
| `reveal.mjs` | Scroll-reveal: no content left hidden at any scroll step, with motion, reduced motion and JS off. |
| `qa_status.mjs` | Projects status: live vs offline copy with the API up or down; cards server-rendered without JS (QA-04). |

Example: `node scripts/qa/qa_nav.mjs http://localhost:3000/pt 1440,375 0,4000`
