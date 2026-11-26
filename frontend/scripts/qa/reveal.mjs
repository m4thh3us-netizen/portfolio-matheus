// CDP regression: scroll reveal, reduced motion, JS off, GPU renderer, Live API, contact form.
const PORT = 9333;
const BASE = process.argv[2] ?? "http://localhost:3000/pt";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newSession() {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.j(new Error(JSON.stringify(m.error))); else p.r(m.result); }
    else if (m.method) listeners.forEach((l) => l(m));
  };
  const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; pending.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => {
    const res = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails).slice(0, 500));
    return res.result.value;
  };
  return { send, evaluate, on: (f) => listeners.push(f), close: async () => { ws.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`); }, ws };
}

const CHECK = `(() => {
  const effOpacity = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const hidden = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') return true; } return false; };
  const ty = (el) => { const t = getComputedStyle(el).transform; if (!t || t === 'none') return 0; const m = new DOMMatrixReadOnly(t); return Math.round(m.m42 * 10) / 10; };
  const els = new Set([...document.querySelectorAll('main h1, main h2, main h3, [data-reveal], main article, footer')]);
  const out = []; let n = 0;
  for (const el of els) {
    if (el.closest('[aria-hidden="true"]') || el.closest('dialog:not([open])')) continue;
    n++;
    const r = el.getBoundingClientRect();
    const o = effOpacity(el);
    const bad = o < 0.999 || hidden(el) || r.width === 0 || r.height === 0 || Math.abs(ty(el)) > 0.5;
    if (bad) out.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), o: Math.round(o * 1000) / 1000, ty: ty(el), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) });
  }
  const counts = { h2: document.querySelectorAll('main h2').length, h3: document.querySelectorAll('main h3').length, reveal: document.querySelectorAll('[data-reveal]').length, articles: document.querySelectorAll('main article').length, canvas: document.querySelectorAll('canvas').length };
  return { checked: n, counts, bad: out };
})()`;

const STEP_CHECK = `(() => {
  const effOpacity = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const vh = innerHeight; const stuck = [];
  for (const el of document.querySelectorAll('main h2, main h3, [data-reveal], main article')) {
    if (el.closest('[aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.8 && r.bottom > 0 && effOpacity(el) < 0.999) stuck.push((el.textContent||'').trim().slice(0,30));
  }
  return stuck;
})()`;

async function scenario(name, { width, height, mobile, reduced, noJs, url = BASE, steps = true }) {
  const s = await newSession();
  const errors = [];
  s.on((m) => { if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 200)); });
  await s.send("Runtime.enable");
  await s.send("Page.enable");
  await s.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  if (reduced) await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (noJs) await s.send("Emulation.setScriptExecutionDisabled", { value: true });
  const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
  await s.send("Page.navigate", { url });
  await loaded;
  await sleep(4000); // load + idle → GSAP / 3D setup
  const result = { name };
  const evalJs = async (expr) => {
    if (!noJs) return s.evaluate(expr);
    // Script execution disabled for the page; Runtime.evaluate still works (DevTools world).
    return s.evaluate(expr);
  };
  result.jsClass = await evalJs("document.documentElement.className.includes(' js') || document.documentElement.classList.contains('js')");
  const initial = await evalJs(CHECK);
  result.initialCanvas = initial.counts.canvas;
  const stepStuck = [];
  if (steps) {
    let y = 0;
    const total = await evalJs("document.documentElement.scrollHeight");
    let guard = 0;
    while (guard++ < 200) {
      const sh = await evalJs("document.documentElement.scrollHeight");
      y += Math.round(height * 0.6);
      await evalJs(`window.scrollTo(0, ${y})`);
      await sleep(1100);
      const st = await evalJs(STEP_CHECK);
      if (st.length) stepStuck.push({ y, st });
      if (y >= sh - height) break;
    }
    result.scrollSteps = guard; result.scrollHeightStart = total;
    result.scrollHeightEnd = await evalJs("document.documentElement.scrollHeight");
    await sleep(1500);
  }
  result.bottom = await evalJs(CHECK);
  await evalJs("window.scrollTo(0,0)");
  await sleep(800);
  result.afterBackToTop = (await evalJs(CHECK)).bad.length;
  result.stepStuck = stepStuck;
  result.errors = errors;
  await s.close();
  return result;
}

async function gpu() {
  const s = await newSession();
  await s.send("Page.navigate", { url: "about:blank" });
  await sleep(300);
  const r = await s.evaluate(`(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return 'no-webgl'; const e = gl.getExtension('WEBGL_debug_renderer_info'); return { vendor: e ? gl.getParameter(e.UNMASKED_VENDOR_WEBGL) : null, renderer: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), cores: navigator.hardwareConcurrency, mem: navigator.deviceMemory }; })()`);
  await s.close();
  return r;
}

async function interact() {
  const s = await newSession();
  const net = [];
  const reqs = new Map();
  s.on((m) => {
    if (m.method === "Network.requestWillBeSent" && m.params.request.url.includes(":8080")) reqs.set(m.params.requestId, { url: m.params.request.url, method: m.params.request.method, t0: m.params.timestamp });
    if (m.method === "Network.responseReceived" && reqs.has(m.params.requestId)) { const q = reqs.get(m.params.requestId); net.push({ ...q, status: m.params.response.status }); }
    if (m.method === "Network.loadingFinished" && reqs.has(m.params.requestId)) { const q = reqs.get(m.params.requestId); const e = net.find((x) => x.url === q.url && x.t0 === q.t0); if (e) e.ms = Math.round((m.params.timestamp - q.t0) * 10000) / 10; }
  });
  await s.send("Network.enable");
  await s.send("Page.enable");
  await s.send("Runtime.enable");
  await s.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
  await s.send("Page.navigate", { url: BASE });
  await loaded;
  await sleep(3000);
  // Live API
  const live = await s.evaluate(`(async () => {
    document.querySelectorAll('#lab [role=tab]')[1].click(); await new Promise(r => setTimeout(r, 500)); const btn = [...document.querySelectorAll('#lab button')].find(b => /executar/i.test(b.textContent));
    if (!btn) return { error: 'button not found', buttons: [...document.querySelectorAll('#lab button')].map(b => b.textContent.trim()) };
    btn.scrollIntoView(); btn.click();
    for (let i = 0; i < 50; i++) { await new Promise(r => setTimeout(r, 200)); if (!btn.disabled && btn.getAttribute('aria-busy') !== 'true') break; }
    await new Promise(r => setTimeout(r, 300));
    const dl = btn.closest('section').querySelectorAll('dl dt, dl dd');
    return { button: btn.textContent.trim(), dl: [...dl].map(x => x.textContent.trim()).join(' | ').slice(0, 300) };
  })()`);
  // Contact form
  await sleep(3500); // > anti-bot minimum fill time
  const contact = await s.evaluate(`(async () => {
    const form = document.querySelector('#contact form') || document.querySelector('form');
    const set = (el, v) => { const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(form.querySelector('[name=name]'), 'QA Browser');
    set(form.querySelector('[name=email]'), 'qa.browser@example.com');
    set(form.querySelector('[name=subject]'), 'Re-test T8c');
    set(form.querySelector('[name=message]'), 'Mensagem enviada pelo teste automatizado de QA (CDP).');
    await new Promise(r => setTimeout(r, 200));
    form.querySelector('button[type=submit]').click();
    const st = form.querySelector('[role=status]');
    for (let i = 0; i < 50; i++) { await new Promise(r => setTimeout(r, 200)); if (st.textContent.trim() && !form.querySelector('button[type=submit]').disabled) break; }
    return { status: st.textContent.trim(), nameAfter: form.querySelector('[name=name]').value };
  })()`);
  await sleep(500);
  await s.close();
  return { live, contact, net };
}

const mode = process.argv[3] ?? "all";
const out = {};
if (mode === "all" || mode === "gpu") out.gpu = await gpu();
if (mode === "all" || mode === "reveal") {
  out.desktop = await scenario("1440 motion", { width: 1440, height: 900, mobile: false });
  out.mobile = await scenario("375 motion", { width: 375, height: 812, mobile: true });
  out.desktopReduced = await scenario("1440 reduced", { width: 1440, height: 900, mobile: false, reduced: true });
  out.mobileReduced = await scenario("375 reduced", { width: 375, height: 812, mobile: true, reduced: true });
  out.desktopNoJs = await scenario("1440 no-js", { width: 1440, height: 900, mobile: false, noJs: true });
  out.mobileNoJs = await scenario("375 no-js", { width: 375, height: 812, mobile: true, noJs: true });
  out.force3d = await scenario("1440 force3d", { width: 1440, height: 900, mobile: false, url: BASE + "?force3d=1", steps: false });
}
if (mode === "all" || mode === "interact") out.interact = await interact();
console.log(JSON.stringify(out, null, 1));
if (mode === "jump") {
  const res = {};
  for (const [label, w, h, mob] of [["1440", 1440, 900, false], ["375", 375, 812, true]]) {
    const s = await newSession();
    await s.send("Page.enable");
    await s.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mob ? 2 : 1, mobile: mob });
    const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
    await s.send("Page.navigate", { url: BASE });
    await loaded; await sleep(4000);
    await s.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)"); await sleep(2500);
    const atBottom = await s.evaluate(CHECK);
    await s.evaluate("window.scrollTo(0, 0)"); await sleep(1000);
    // anchor jump to #projects then #contact
    await s.evaluate("document.querySelector('#projects').scrollIntoView()"); await sleep(1500);
    const proj = await s.evaluate(STEP_CHECK);
    await s.evaluate("location.hash = '#contact'"); await sleep(1500);
    const cont = await s.evaluate(STEP_CHECK);
    const all = await s.evaluate(CHECK);
    res[label] = { bottomBad: atBottom.bad.map(b => b.text.slice(0, 25) + ' o' + b.o + ' ' + b.w + 'x' + b.h), projStuck: proj, contactStuck: cont, finalBad: all.bad.map(b => b.text.slice(0, 25) + ' o' + b.o + ' ' + b.w + 'x' + b.h) };
    await s.close();
  }
  console.log(JSON.stringify(res, null, 1));
}
if (mode === "jump2") {
  const res = {};
  for (const [label, w, h, mob, how] of [["375-bottom", 375, 812, true, "bottom"], ["375-hash", 375, 812, true, "hash"], ["1440-bottom", 1440, 900, false, "bottom"], ["375-end-key-like-twice", 375, 812, true, "bottom2"]]) {
    const s = await newSession();
    await s.send("Page.enable");
    await s.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mob ? 2 : 1, mobile: mob });
    const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
    await s.send("Page.navigate", { url: BASE });
    await loaded; await sleep(4000);
    if (how === "hash") await s.evaluate("location.hash = '#contact'");
    else await s.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    await sleep(2500);
    if (how === "bottom2") { await s.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)"); await sleep(2500); }
    const info = await s.evaluate(`(() => { const f = document.querySelector('#contact form').closest('[data-reveal]') || document.querySelector('#contact form'); const r1 = f.getBoundingClientRect(); return { y: scrollY, sh: document.documentElement.scrollHeight, vh: innerHeight, formTop: Math.round(r1.top), formBottom: Math.round(r1.bottom), op: getComputedStyle(f).opacity, tr: getComputedStyle(f).transform }; })()`);
    // now bring the form into the middle of the viewport and wait
    await s.evaluate("document.querySelector('#contact form').scrollIntoView({block:'center'})"); await sleep(2500);
    const after = await s.evaluate(`(() => { const f = document.querySelector('#contact form').closest('[data-reveal]') || document.querySelector('#contact form'); const r = f.getBoundingClientRect(); return { top: Math.round(r.top), op: getComputedStyle(f).opacity }; })()`);
    // small user scrolls up and down
    await s.evaluate("window.scrollBy(0,-300)"); await sleep(800); await s.evaluate("window.scrollBy(0,300)"); await sleep(1500);
    const after2 = await s.evaluate(`getComputedStyle(document.querySelector('#contact form').closest('[data-reveal]') || document.querySelector('#contact form')).opacity`);
    const all = await s.evaluate(CHECK);
    res[label] = { info, after, after2, finalBad: all.bad.filter(b => b.w > 0).map(b => b.tag + ' ' + b.text.slice(0, 25) + ' o' + b.o + ' ty' + b.ty + ' top' + b.top) };
    await s.close();
  }
  console.log(JSON.stringify(res, null, 1));
}
if (mode === "nav") {
  const res = {};
  for (const [label, w, h, mob] of [["1440", 1440, 900, false], ["375", 375, 812, true]]) {
    for (const target of ["about", "projects", "lab", "contact"]) {
      const s = await newSession();
      await s.send("Page.enable");
      await s.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mob ? 2 : 1, mobile: mob });
      const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
      await s.send("Page.navigate", { url: BASE });
      await loaded; await sleep(4000);
      const r = await s.evaluate(`(async () => {
        const a = [...document.querySelectorAll('a[href="#${target}"], a[href$="#${target}"]')][0];
        if (!a) return { error: 'no link' };
        a.click();
        const samples = [];
        for (const t of [300, 1000, 2500]) { await new Promise(r => setTimeout(r, t - (samples.length ? [300,1000,2500][samples.length-1] : 0))); const sec = document.getElementById('${target}'); samples.push(Math.round(sec.getBoundingClientRect().top)); }
        const sec = document.getElementById('${target}');
        const eff = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
        const hiddenInView = [...sec.querySelectorAll('h2,h3,[data-reveal],article')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.top < innerHeight * 0.8 && b.bottom > 0 && eff(e) < 0.999; }).length;
        return { href: a.getAttribute('href'), secTopAt300_1000_2500: samples, hash: location.hash, y: Math.round(scrollY), hiddenInView };
      })()`);
      res[label + ' #' + target] = r;
      await s.close();
    }
  }
  console.log(JSON.stringify(res));
}
if (mode === "nav2") {
  const res = {};
  for (const variant of ["default", "reduced", "nojs", "default-wait10s"]) {
    for (const target of ["lab", "contact"]) {
      const s = await newSession();
      await s.send("Page.enable");
      await s.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      if (variant === "reduced") await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
      if (variant === "nojs") await s.send("Emulation.setScriptExecutionDisabled", { value: true });
      const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
      await s.send("Page.navigate", { url: BASE });
      await loaded; await sleep(variant === "default-wait10s" ? 10000 : 4000);
      // real mouse click on the header link (works with JS disabled too)
      const pos = await s.evaluate(`(() => { const a = document.querySelector('header a[href="#${target}"]') || document.querySelector('a[href="#${target}"]'); const b = a.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, vis: b.width > 0 }; })()`);
      if (pos.vis) {
        for (const type of ["mousePressed", "mouseReleased"]) await s.send("Input.dispatchMouseEvent", { type, x: pos.x, y: pos.y, button: "left", clickCount: 1 });
      } else await s.evaluate(`document.querySelector('a[href="#${target}"]').click()`);
      await sleep(3000);
      const r = await s.evaluate(`({ top: Math.round(document.getElementById('${target}').getBoundingClientRect().top), y: Math.round(scrollY), hash: location.hash, sb: getComputedStyle(document.documentElement).scrollBehavior })`);
      res[variant + ' #' + target] = { realClick: pos.vis, ...r };
      await s.close();
    }
  }
  console.log(JSON.stringify(res));
}
if (mode === "nav3") {
  const res = {};
  const variants = {
    "motion+sb-auto": "html{scroll-behavior:auto!important}",
    "motion+cv-visible": "main>section,body>footer{content-visibility:visible!important}",
    "motion+block-gsap": null,
  };
  for (const [variant, css] of Object.entries(variants)) {
    for (const target of ["lab", "contact"]) {
      const s = await newSession();
      await s.send("Page.enable"); await s.send("Network.enable");
      await s.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      if (variant === "motion+block-gsap") {
        // find GSAP chunks: block any chunk whose body contains ScrollTrigger by URL list gathered from a prior load is complex; instead neutralise MotionLayer by stubbing ResizeObserver refresh: block nothing, but stub ScrollTrigger.refresh after import is not possible. Use requestIdleCallback removal so afterLoadIdle never fires.
        await s.send("Page.addScriptToEvaluateOnNewDocument", { source: "window.requestIdleCallback = () => 0;" });
      }
      const loaded = new Promise((r) => s.on((m) => m.method === "Page.loadEventFired" && r()));
      await s.send("Page.navigate", { url: BASE });
      await loaded;
      if (css) await s.evaluate(`(() => { const st = document.createElement('style'); st.textContent = ${JSON.stringify(css)}; document.head.appendChild(st); })()`);
      await sleep(4000);
      const meta = await s.evaluate("({ canvas: document.querySelectorAll('canvas').length, gsapHidden: [...document.querySelectorAll('[data-reveal]')].filter(e => e.style.opacity === '0').length })");
      const pos = await s.evaluate(`(() => { const a = document.querySelector('header a[href="#${target}"]'); const b = a.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
      for (const type of ["mousePressed", "mouseReleased"]) await s.send("Input.dispatchMouseEvent", { type, x: pos.x, y: pos.y, button: "left", clickCount: 1 });
      await sleep(3000);
      const r = await s.evaluate(`({ top: Math.round(document.getElementById('${target}').getBoundingClientRect().top), y: Math.round(scrollY) })`);
      res[variant + ' #' + target] = { ...meta, ...r };
      await s.close();
    }
  }
  console.log(JSON.stringify(res));
}
