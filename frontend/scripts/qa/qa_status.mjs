// QA-04 verification. Usage: node qa_status.mjs <label>   (run once with API up, once with API down)
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function newSession() {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.j(new Error(JSON.stringify(m.error))); else p.r(m.result); } else if (m.method) listeners.forEach((l) => l(m)); };
  const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; pending.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => { const res = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails).slice(0, 400)); return res.result.value; };
  return { send, evaluate, on: (f) => listeners.push(f), close: async () => { ws.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`); } };
}
const SNAP = `(() => { const p = document.getElementById('projects'); if (!p) return null; const live = p.querySelector('[aria-live]'); const cards = [...p.querySelectorAll('article')]; const eff = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; }; return { status: (live?.textContent || '').trim(), cards: cards.length, titles: cards.map(c => c.querySelector('h3')?.textContent.trim()), minOpacity: cards.length ? Math.min(...cards.map(eff)) : null, retryBtn: !!live?.querySelector('button') }; })()`;
const label = process.argv[2] ?? "run";
const out = {};
for (const lang of ["pt", "en"]) {
  for (const [w, h, mob] of [[1440, 900, false], [375, 812, true]]) {
    // JS disabled
    {
      const s = await newSession();
      await s.send("Page.enable");
      await s.send("Emulation.setScriptExecutionDisabled", { value: true });
      await s.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mob ? 2 : 1, mobile: mob });
      const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
      await s.send("Page.navigate", { url: `http://localhost:3000/${lang}` }); await loaded; await sleep(800);
      await s.evaluate("document.getElementById('projects').scrollIntoView()"); await sleep(300);
      out[`${label} ${lang} ${w} nojs`] = await s.evaluate(SNAP);
      await s.close();
    }
    // JS enabled: sample the status line from DOMContentLoaded to 8 s after load
    {
      const s = await newSession();
      await s.send("Page.enable");
      await s.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mob ? 2 : 1, mobile: mob });
      await s.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__seq = []; (function poll(){ const p = document.getElementById('projects'); if (p) { const l = p.querySelector('[aria-live]'); const st = (l && l.textContent || '').trim() + ' |cards=' + p.querySelectorAll('article').length; const q = window.__seq; if (!q.length || q[q.length-1].s !== st) q.push({ t: Math.round(performance.now()), s: st }); } if (performance.now() < 15000) setTimeout(poll, 20); })();` });
      const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
      await s.send("Page.navigate", { url: `http://localhost:3000/${lang}` }); await loaded; await sleep(8000);
      const seq = await s.evaluate("window.__seq");
      const fin = await s.evaluate(SNAP);
      out[`${label} ${lang} ${w} js`] = { seq, final: { status: fin.status, cards: fin.cards, minOpacity: fin.minOpacity, retryBtn: fin.retryBtn } };
      await s.close();
    }
  }
}
console.log(JSON.stringify(out, null, 1));
