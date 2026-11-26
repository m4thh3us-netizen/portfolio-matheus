// QA independent verification of QA-05. Usage: node qa_nav.mjs <base> <widths:1440,375> <delays:dcl,0,300,1000,4000> [hashload]
// - Desktop: real mouse click (CDP Input) at link centre, after checking elementFromPoint hits the link.
// - Mobile 375: touch emulation ON, real taps (Input.dispatchTouchEvent) on menu button, then on the link.
// - Settle: scrollY unchanged for 1000 ms (max 12 s), then +3 s and re-measure (drift = late refresh / layout shift).
const PORT = 9333;
const BASE = process.argv[2] ?? "http://localhost:3000/pt";
const WIDTHS = (process.argv[3] ?? "1440,375").split(",");
const DELAYS = (process.argv[4] ?? "dcl,0,300,1000,4000").split(",");
const HASHLOAD = process.argv[5] ?? "";
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
const target = async (s, sel) => s.evaluate(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => e.getClientRects().length && e.getBoundingClientRect().width); const a = els[0]; if (!a) return null; const b = a.getBoundingClientRect(); const x = b.x + b.width / 2, y = b.y + b.height / 2; const hit = document.elementFromPoint(x, y); return { x, y, hitOk: !!hit && (hit === a || a.contains(hit)), hit: hit ? hit.tagName + '.' + String(hit.className).slice(0,30) : null }; })()`);
async function press(s, sel, mob) {
  const p = await target(s, sel);
  if (!p) throw new Error("no visible element " + sel);
  if (mob) {
    await s.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: p.x, y: p.y }] });
    await s.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await s.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
    await s.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
    await s.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 });
  }
  return p;
}
const settle = (s) => s.evaluate(`(async () => { let last = scrollY, stable = 0, t = 0, maxY = scrollY; while (t < 12000) { await new Promise(r => setTimeout(r, 100)); t += 100; maxY = Math.max(maxY, scrollY); if (scrollY === last) { stable += 100; if (stable >= 1000) break; } else { stable = 0; last = scrollY; } } return { t, maxY: Math.round(maxY) }; })()`);
const measure = (s, id) => s.evaluate(`(() => { const sec = document.getElementById('${id}'); const hb = sec.querySelector('header') || sec; const h2 = sec.querySelector('h2'); const hdr = document.querySelector('body > header, header.fixed') ; const hdrB = Math.round(hdr.getBoundingClientRect().bottom); const eff = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; }; const r2 = h2.getBoundingClientRect(); return { hdrB, eyebrowTop: Math.round(hb.getBoundingClientRect().top), h2Top: Math.round(r2.top), h2Bot: Math.round(r2.bottom), h2Op: +eff(h2).toFixed(2), y: Math.round(scrollY), vh: innerHeight, hash: location.hash, menuOpen: !!document.querySelector('header [id][hidden]') === false, gsap: [...document.querySelectorAll('[data-reveal]')].some(e => e.style.opacity !== '' || e.style.transform !== '') }; })()`);
async function open(w, h, mob, url, delay) {
  const s = await newSession(); const errors = [];
  s.on((m) => { if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 150)); });
  await s.send("Runtime.enable"); await s.send("Page.enable");
  await s.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mob ? 2 : 1, mobile: mob });
  if (process.env.THROTTLE) await s.send("Emulation.setCPUThrottlingRate", { rate: +process.env.THROTTLE });
  await s.send("Emulation.setTouchEmulationEnabled", { enabled: mob, maxTouchPoints: mob ? 5 : 1 });
  const dcl = new Promise((r) => s.on((m) => m.method === "Page.domContentEventFired" && r()));
  const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
  await s.send("Page.navigate", { url });
  if (delay === "dcl") await dcl; else { await loaded; await sleep(+delay); }
  return { s, errors };
}
const IDS = ["about", "projects", "lab", "stack", "journey", "contact"];
const ok = (m) => m.eyebrowTop >= m.hdrB && m.h2Top >= m.hdrB && m.h2Bot <= m.vh && m.eyebrowTop <= m.hdrB + 40 && m.h2Op > 0.99;
const rows = []; let fails = 0;
for (const wl of WIDTHS) {
  const [w, h, mob] = wl === "375" ? [375, 812, true] : [1440, 900, false];
  for (const delay of DELAYS) {
    for (const id of IDS) {
      const { s, errors } = await open(w, h, mob, BASE, delay);
      let hit;
      try {
        if (mob) {
          // the menu button only works after hydration; for 'dcl' wait until it toggles (user would retap)
          let opened = false;
          for (let i = 0; i < 40 && !opened; i++) { await press(s, "header button[aria-controls]", true); await sleep(150); opened = await s.evaluate(`!document.getElementById(document.querySelector('header button[aria-controls]').getAttribute('aria-controls')).hidden`); if (!opened) await sleep(100); }
          await sleep(250);
          hit = await press(s, `header nav a[href="#${id}"]`, true);
        } else hit = await press(s, `header nav a[href="#${id}"]`, false);
      } catch (e) { rows.push({ w: wl, delay, id, err: e.message }); fails++; await s.close(); continue; }
      const st = await settle(s);
      const m1 = await measure(s, id);
      await sleep(3000); await settle(s);
      const m2 = await measure(s, id);
      const good = hit.hitOk && ok(m1) && ok(m2) && Math.abs(m2.y - m1.y) <= 2;
      if (!good) fails++;
      rows.push({ w: wl, delay, id, hitOk: hit.hitOk, settleMs: st.t, eyebrow: m1.eyebrowTop, h2: m1.h2Top, h2Bot: m1.h2Bot, y: m1.y, drift: m2.y - m1.y, eyebrow3s: m2.eyebrowTop, gsap: m2.gsap, hash: m2.hash, errs: errors.length, ok: good });
      await s.close();
    }
  }
  if (HASHLOAD) for (const id of HASHLOAD.split(",")) {
    const { s, errors } = await open(w, h, mob, BASE + "#" + id, "0");
    await settle(s); const m1 = await measure(s, id);
    await sleep(4000); await settle(s); const m2 = await measure(s, id);
    const good = ok(m1) && ok(m2) && Math.abs(m2.y - m1.y) <= 2;
    if (!good) fails++;
    rows.push({ w: wl, delay: "direct", id, hitOk: "-", eyebrow: m1.eyebrowTop, h2: m1.h2Top, h2Bot: m1.h2Bot, y: m1.y, drift: m2.y - m1.y, eyebrow3s: m2.eyebrowTop, gsap: m2.gsap, hash: m2.hash, errs: errors.length, ok: good });
    await s.close();
  }
}
console.table(rows);
console.log("BASE", BASE, "FAILS", fails, "of", rows.length);
