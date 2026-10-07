#!/usr/bin/env node
// Usage: node mobile-audit.mjs <baseUrl> [outDir=./audit-out]
// Env: PAGES=index,work  WIDTHS=360,390  subset | MODE=dynamic  scroll-sampled gaps + touch/mouse replay
//      CONSOLE_ONLY=1 (dynamic: JS errors only) | DEBUG=1 verbose
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { homedir } from 'node:os';
import path from 'node:path';

const BASE = (process.argv[2] || (console.error('Usage: node mobile-audit.mjs <baseUrl> [outDir]'), process.exit(1))).replace(/\/$/, '');
const OUT = process.argv[3] || path.join(process.cwd(), 'audit-out');
mkdirSync(OUT, { recursive: true });
const DYN = process.env.MODE === 'dynamic';
const PORT = DYN ? 9334 : 9333;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = mkdtempSync(path.join(tmpdir(), 'audit-')); // fresh every run: a reused profile serves cached old CSS/JS
const ALL_PAGES = ['index'];
const PAGES = process.env.PAGES ? process.env.PAGES.split(',') : ALL_PAGES;
const VPS = [[360, 780], [390, 844], [430, 932], [768, 1024], [1373, 900]]
  .filter(([w]) => !process.env.WIDTHS || process.env.WIDTHS.split(',').includes(String(w)));
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(PROFILE, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const pg = list.find(t => t.type === 'page');
      if (pg) return pg.webSocketDebuggerUrl;
    } catch {}
    await sleep(300);
  }
  throw new Error('chrome did not start');
}

// In-page audit; returns array of findings.
const AUDIT = `(() => {
const VW = document.documentElement.clientWidth;
const out = [];
const sel = el => {
  const parts = [];
  for (let e = el; e && e.nodeType === 1 && e !== document.documentElement; e = e.parentElement) {
    let s = e.tagName.toLowerCase();
    if (e.id) s += '#' + e.id;
    const c = [...e.classList].filter(x => !/^(is-|js-|gsap)/.test(x)).slice(0, 2).join('.');
    if (c) s += '.' + c;
    parts.unshift(s);
    if (e.id || parts.length >= 4) break;
  }
  return parts.join(' > ');
};
const R = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left*10)/10, y: Math.round((r.top+scrollY)*10)/10, w: Math.round(r.width*10)/10, h: Math.round(r.height*10)/10, r: Math.round(r.right*10)/10 }; };
const visible = el => {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && r.width > 1 && r.height > 1;
};
const clipped = el => { // clipped horizontally by an ancestor overflow:hidden/clip (or fixed-offscreen)
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const o = getComputedStyle(p).overflowX;
    if (o === 'hidden' || o === 'clip') { const pr = p.getBoundingClientRect(); if (pr.right <= VW + 1 && pr.left >= -1) return true; }
  }
  return false;
};
const all = [...document.body.querySelectorAll('*')].filter(e => !['SCRIPT','STYLE','NOSCRIPT','PATH','SVG','CANVAS','BR','LINE','CIRCLE','G','DEFS'].includes(e.tagName.toUpperCase()));
// (a) overflow
const de = document.documentElement;
if (de.scrollWidth > de.clientWidth) out.push({ type: 'overflow-html', sel: 'html', rect: {w: de.scrollWidth}, off: de.scrollWidth - de.clientWidth });
for (const e of all) {
  if (!visible(e)) continue;
  const r = e.getBoundingClientRect();
  if (r.right > VW + 1 && !clipped(e)) {
    // skip if fixed/absolute offscreen drawer
    const cs = getComputedStyle(e);
    out.push({ type: 'overflow', sel: sel(e), rect: R(e), off: Math.round((r.right - VW)*10)/10, note: cs.position });
  }
}
// (b) gutter
const secs = [...document.querySelectorAll('body > header, body > section, body > footer, body > main > section, body > nav, main > *, body > div > section')];
const seenSec = new Set();
const TXT = 'h1,h2,h3,h4,p,a.btn,button,.btn,li,label,input,textarea,figure,.card,[class*=card]';
for (const s of secs) {
  if (seenSec.has(s) || !visible(s)) continue; seenSec.add(s);
  const items = [...s.querySelectorAll(TXT)].filter(e => visible(e) && (e.textContent||'').trim().length > 0 || e.matches('input,textarea'))
    .filter(e => visible(e) && !e.closest('.marquee,[aria-hidden=true]') && !clipped(e))
    .map(e => ({ e, r: e.getBoundingClientRect() })).filter(o => o.r.left >= -1 && o.r.left < VW);
  if (items.length < 3) continue;
  const bins = {}; items.forEach(o => { const k = Math.round(o.r.left); bins[k] = (bins[k]||0)+1; });
  const dom = +Object.entries(bins).sort((a,b)=>b[1]-a[1])[0][0];
  for (const o of items) {
    const d = o.r.left - dom;
    if (Math.abs(d) >= 4) {
      // allow nested indentation only if element is inside another item of same section with larger left (cards/lists): still report, review manually
      out.push({ type: 'gutter', sel: sel(o.e), rect: R(o.e), off: Math.round(d*10)/10, note: 'dominant=' + dom + ' in ' + sel(s) });
    }
  }
}

// (b2) global gutter + (g) right-gap asymmetry
{
  const cand = [...document.body.querySelectorAll('h1,h2,h3,p,a.btn,.btn,.eyebrow,[class*=eyebrow],img,figure,picture,video,form,input,textarea,select,button:not(.nav__burger)')]
    .filter(e => visible(e) && !clipped(e) && !e.closest('header.site-nav,.marquee,[aria-hidden=true],canvas'));
  const bins = {}; cand.forEach(e => { const l = Math.round(e.getBoundingClientRect().left); if (l > 0 && l < VW/3) bins[l] = (bins[l]||0)+1; });
  const top = Object.entries(bins).sort((a,b)=>b[1]-a[1])[0]; const GUT = top ? +top[0] : null;
  const boxy = p => { const cs = getComputedStyle(p); return (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || parseFloat(cs.borderLeftWidth) > 0 || /^(LI|ARTICLE|BLOCKQUOTE|FIGURE|A|BUTTON)$/.test(p.tagName); };
  for (const e of (GUT === null ? [] : cand)) {
    const r = e.getBoundingClientRect(); if (r.width < 8) continue;
    let nested = false;
    for (let p = e.parentElement; p && !/^(SECTION|HEADER|FOOTER|BODY|MAIN)$/.test(p.tagName); p = p.parentElement) if (boxy(p) && p.getBoundingClientRect().left > GUT - 2 && p !== e) { nested = true; break; }
    if (!nested && r.left >= 1 && Math.abs(r.left - GUT) >= 4 && r.left < VW * 0.75)
      out.push({ type: 'gutter-global', sel: sel(e), rect: R(e), off: Math.round((r.left-GUT)*10)/10, note: 'GUT=' + GUT });
    // right gap vs left gap for block-ish media/buttons/forms
    if (!nested && /^(IMG|FIGURE|PICTURE|VIDEO|FORM)$/.test(e.tagName) || (!nested && e.matches('a.btn,.btn,button'))) {
      const lg = r.left, rg = VW - r.right;
      if (Math.abs(lg - GUT) < 4 && rg - lg >= 4 && rg > GUT + 4 && r.width > VW*0.4) out.push({ type: 'right-gap', sel: sel(e), rect: R(e), off: Math.round((rg-lg)*10)/10, note: 'gapL=' + Math.round(lg) + ' gapR=' + Math.round(rg) });
    }
  }
}
// (c) centering
for (const e of all) {
  if (!visible(e) || !e.parentElement || clipped(e)) continue;
  const cs = getComputedStyle(e), ps = getComputedStyle(e.parentElement);
  const intended = cs.textAlign === 'center' && false || (cs.marginLeft === cs.marginRight && cs.marginLeft !== '0px' && /auto|^[1-9]/.test(cs.marginLeft) && cs.display === 'block' && cs.position !== 'absolute')
    || ((ps.display.includes('flex') && ps.justifyContent === 'center' && !ps.flexDirection.startsWith('column')) )
    || (ps.display.includes('flex') && ps.flexDirection.startsWith('column') && ps.alignItems === 'center')
    || (ps.display.includes('grid') && (ps.justifyItems === 'center' || ps.placeItems.startsWith('center')));
  if (!intended) continue;
  const pr = e.parentElement.getBoundingClientRect(), r = e.getBoundingClientRect();
  const pl = parseFloat(ps.paddingLeft)||0, prr = parseFloat(ps.paddingRight)||0;
  const l = r.left - (pr.left + pl), rt = (pr.right - prr) - r.right;
  if (Math.abs(l - rt) > 4 && r.width < pr.width - pl - prr - 1) out.push({ type: 'center', sel: sel(e), rect: R(e), off: Math.round(Math.abs(l-rt)*10)/10, note: 'gapL=' + Math.round(l) + ' gapR=' + Math.round(rt) });
}
// (d) overlaps among siblings
for (const p of document.body.querySelectorAll('*')) {
  const kids = [...p.children].filter(k => visible(k) && !['SCRIPT','STYLE','CANVAS'].includes(k.tagName) && !['absolute','fixed'].includes(getComputedStyle(k).position));
  if (kids.length < 2 || kids.length > 40) continue;
  for (let i = 0; i < kids.length; i++) for (let j = i+1; j < kids.length; j++) {
    const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
    const w = Math.min(a.right,b.right) - Math.max(a.left,b.left), h = Math.min(a.bottom,b.bottom) - Math.max(a.top,b.top);
    if (w > 0 && h > 0 && w*h > 16) out.push({ type: 'overlap', sel: sel(kids[i]) + '  X  ' + sel(kids[j]), rect: R(kids[i]), off: Math.round(w*h), note: 'w=' + Math.round(w) + ' h=' + Math.round(h) });
  }
}
// (e) tap targets
for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button]')) {
  if (!visible(e) || clipped(e) && false) continue;
  const r = e.getBoundingClientRect();
  if (r.right < 0 || r.left > VW) continue;
  if (r.width < 40 || r.height < 40) out.push({ type: 'tap', sel: sel(e), rect: R(e), off: Math.round(Math.max(40 - r.width, 40 - r.height)), note: (e.textContent||'').trim().slice(0, 24) });
}
return out;
})()`;

const SETTLE = `(async () => {
  const H = () => document.documentElement.scrollHeight;
  for (let y = 0; y < H(); y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
  scrollTo(0, H()); await new Promise(r => setTimeout(r, 400));
  scrollTo(0, 0); await new Promise(r => setTimeout(r, 300));
  try {
    if (window.gsap) {
      gsap.globalTimeline.progress(1);
      if (window.ScrollTrigger) { ScrollTrigger.getAll().forEach(t => t.animation && t.animation.progress(1)); ScrollTrigger.refresh(); }
      gsap.globalTimeline.getChildren(true, true, true).forEach(t => { try { t.progress(1); } catch {} });
    }
  } catch (e) {}
  // clear leftover inline transforms/opacity on reveal elements so measurement uses final CSS layout
  document.querySelectorAll('[data-reveal],[data-reveal] *,.hero__line').forEach(el => {
    if (el.style.transform && /translate/.test(el.style.transform)) el.style.transform = 'none';
    if (el.style.opacity !== '' && parseFloat(el.style.opacity) < 1) el.style.opacity = '1';
  });
  document.querySelectorAll('.loader').forEach(l => l.style.display = 'none');
  await new Promise(r => setTimeout(r, 500));
  return H();
})()`;

const wsUrl = await connect();
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') (globalThis.__errs ||= []).push('exception: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 160)); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') (globalThis.__errs ||= []).push('log: ' + d.params.entry.text.slice(0, 160) + ' ' + (d.params.entry.url || '')); if (d.method === 'Page.javascriptDialogOpening') { console.error('DIALOG', d.params.message); send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; const t = setTimeout(() => { pend.delete(i); rej(new Error('CDP timeout 15s: ' + method)); }, 15000); pend.set(i, d => { clearTimeout(t); d.error ? rej(new Error(method + ': ' + d.error.message)) : res(d.result); }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; };

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
if (DYN) {
  // ===== MODE=dynamic: scroll-sampled card gaps + touch/mouse replay =====
  const DVPS = [[360, 780], [390, 844], [430, 932], [768, 1024], [980, 1100], [1373, 900]]
    .filter(([w]) => !process.env.WIDTHS || process.env.WIDTHS.split(',').includes(String(w)));
  const DPAGES = process.env.PAGES ? process.env.PAGES.split(',') : ALL_PAGES;
  const dres = [];
  const DYN_SETUP = `(async () => {
    document.querySelectorAll('.loader').forEach(l => l.style.display = 'none');
    if (window.gsap && window.ScrollTrigger) {
      ScrollTrigger.refresh();
      ScrollTrigger.getAll().filter(t => !t.vars.scrub).forEach(t => { try { t.animation && t.animation.progress(1); } catch {} });
    }
    window.__scrollTo = (y) => { const L = window.__lenis; if (L) L.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); window.ScrollTrigger && ScrollTrigger.update(); };
    window.__raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    // click suppressor so plain taps on external links never navigate
    document.addEventListener('click', e => e.preventDefault(), true);
    window.__scrollTo(0); await window.__raf2();
    return document.documentElement.scrollHeight;
  })()`;
  // measure consecutive card/project gaps at current scroll
  const DYN_GAPS = `(() => {
    const out = [];
    const cards = [...document.querySelectorAll('.work-card')];
    for (let i = 1; i < cards.length; i++) {
      const prevBody = cards[i-1].querySelector('.work-card__body'), st = cards[i].querySelector('.work-card__stage');
      if (!prevBody || !st) continue;
      out.push({ pair: 'card' + i + '->' + (i+1), gap: Math.round((st.getBoundingClientRect().top - prevBody.getBoundingClientRect().bottom) * 10) / 10 });
    }
    const pr = [...document.querySelectorAll('.project')];
    for (let i = 1; i < pr.length; i++) {
      const a = pr[i-1].querySelector('.project__content'), b = pr[i].querySelector('.project__media');
      if (!a || !b) continue;
      out.push({ pair: 'project' + i + '->' + (i+1), gap: Math.round((b.getBoundingClientRect().top - a.getBoundingClientRect().bottom) * 10) / 10 });
    }
    return out;
  })()`;
  const DYN_TOUCH_LIST = `(() => [...document.querySelectorAll('.work-card__link,.project__cta,.btn,button')]
    .filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('#navMobile,.nav__burger') && e.id !== 'navBurger'; })
    .map((e, i) => { e.setAttribute('data-dyn', i); return { i, label: (e.className || e.tagName).toString().split(' ')[0] + ':' + (e.textContent || '').trim().slice(0, 18).replace(/\\s+/g, ' ') }; }))()`;
  const DYN_PREP = i => `(async () => {
    const e = document.querySelector('[data-dyn="${i}"]'); const r0 = e.getBoundingClientRect();
    const target = scrollY + r0.top + r0.height / 2 - innerHeight * 0.55;
    window.__scrollTo(Math.max(0, target)); await window.__raf2(); await new Promise(r => setTimeout(r, 150));
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: Math.min(Math.max(r.top + r.height / 2, 90), innerHeight - 90) };
  })()`;
  const DYN_STATE = i => `(() => {
    const e = document.querySelector('[data-dyn="${i}"]'); const cs = getComputedStyle(e);
    const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
    const scale = Math.hypot(m.m11, m.m12), rot = Math.abs(Math.atan2(m.m12, m.m11) * 180 / Math.PI);
    const nonId = Math.abs(scale - 1) > 0.002 || rot > 0.05 || Math.abs(m.m13) > 1e-4 || Math.abs(m.m23) > 1e-4 || Math.abs(m.m31) > 1e-4 || Math.abs(m.m32) > 1e-4 || Math.abs(m.m33 - 1) > 1e-3;
    const sm = cs.boxShadow.match(/rgba?\\(([^)]+)\\)/); let alpha = 0;
    if (sm) { const p = sm[1].split(',').map(Number); alpha = p.length > 3 ? p[3] : 1; if (cs.boxShadow === 'none') alpha = 0; }
    let overlap = 0;
    const card = e.closest('.work-card');
    if (card && card.previousElementSibling && card.previousElementSibling.querySelector('.work-card__cta')) {
      const a = e.getBoundingClientRect(), c = card.previousElementSibling.querySelector('.work-card__cta').getBoundingClientRect();
      const w = Math.min(a.right, c.right) - Math.max(a.left, c.left), h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      if (w > 0 && h > 0) overlap = Math.round(h * 10) / 10;
    }
    const g = k => e.style.getPropertyValue(k).trim() || getComputedStyle(e).getPropertyValue(k).trim(); const vars = { x: g('--tilt-x'), y: g('--tilt-y'), s: g('--tilt-scale'), a: g('--tilt-shadow-a') };
    return { vars, transform: cs.transform, scale: Math.round(scale * 1000) / 1000, rot: Math.round(rot * 100) / 100, nonId, alpha, overlap };
  })()`;

  const FORCE_SNAP = `(() => [...document.querySelectorAll('.work-card')].map(c => {
    const l = c.querySelector('.work-card__link'), n = c.querySelector('.work-card__name'), i = c.querySelector('.work-card__cta i'), cta = c.querySelector('.work-card__cta');
    const cs = getComputedStyle(l), m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
    const sm = cs.boxShadow.match(/rgba?\\(([^)]+)\\)/); let alpha = 0; if (sm && cs.boxShadow !== 'none') { const p = sm[1].split(',').map(Number); alpha = p.length > 3 ? p[3] : 1; }
    return { transform: cs.transform, scale: Math.hypot(m.m11, m.m12), rotX: m.m23, shadowAlpha: alpha, nameColor: getComputedStyle(n).color, ctaColor: getComputedStyle(cta).color, arrow: getComputedStyle(i).transform };
  }))()`;
  const FORCE_SET = `[...document.querySelectorAll('.work-card__link')].forEach(l => { l.style.setProperty('--tilt-x','8'); l.style.setProperty('--tilt-y','-6'); l.style.setProperty('--tilt-scale','1.03'); l.style.setProperty('--tilt-shadow-a','.28'); })`;
  const FORCE_CLR = `[...document.querySelectorAll('.work-card__link')].forEach(l => ['--tilt-x','--tilt-y','--tilt-scale','--tilt-shadow-a'].forEach(k => l.style.removeProperty(k)))`;
  async function forcedTest() {
    // Force the real stuck state (inline tilt vars, as the pointermove handler leaves them). No CDP pseudo-state forcing.
    await send('Page.bringToFront'); await evalJS(`(async()=>{ window.__scrollTo(0); await new Promise(r => setTimeout(r, 150)); })()`);
    console.error('fstep 1');
    console.error('fstep 2');
    const hoverNone = await evalJS('matchMedia("(hover: none)").matches');
    console.error('fstep 3');
    const rest = await evalJS(FORCE_SNAP);
    console.error('fstep 4');
    await evalJS(FORCE_SET);
    console.error('fstep 5');
    await sleep(700);
    const forced = await evalJS(FORCE_SNAP);
    console.error('fstep 6');
    await evalJS(FORCE_CLR);
    console.error('fstep 7');
    const ident = f => Math.abs(f.scale - 1) < 0.002 && Math.abs(f.rotX) < 1e-4 && f.shadowAlpha < 0.001;
    return { cards: rest.length, hoverNone, forcedIdentity: forced.every(ident), forcedTilts: forced.every(f => !ident(f)),
      sample: { rest: rest[0], forced: forced[0] } };
  }
  const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const shotVP = async (w, h, file) => { const s = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(file, Buffer.from(s.data, 'base64')); };

  try {
    for (const [w, h] of DVPS) {
      const mobile = w < 1000;
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile, screenWidth: w, screenHeight: h });
      await send('Emulation.setUserAgentOverride', { userAgent: mobile ? UA : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
      await send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }].concat(mobile
        ? [{ name: 'hover', value: 'none' }, { name: 'any-hover', value: 'none' }, { name: 'pointer', value: 'coarse' }, { name: 'any-pointer', value: 'coarse' }]
        : [{ name: 'hover', value: 'hover' }, { name: 'any-hover', value: 'hover' }, { name: 'pointer', value: 'fine' }, { name: 'any-pointer', value: 'fine' }]) });
      await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
      for (const p of DPAGES) {
        await send('Page.navigate', { url: `${BASE}/${p}.html` });
        await sleep(3500);
        await send('Page.bringToFront');
        await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile, screenWidth: w, screenHeight: h });
        const rec = { page: p, width: w, mobile, gaps: {}, touch: [], mouse: null };
        const H = await evalJS(DYN_SETUP);
        rec.height = H;
        globalThis.__errs = [];
        if (process.env.CONSOLE_ONLY) { await sleep(1500); rec.errors = [...globalThis.__errs]; }
        else if (mobile) {
          // scroll sampling
          const maxY = H - h;
          for (let y = 0; y <= maxY + 99; y += 100) {
            const yy = Math.min(y, maxY);
            await evalJS(`(async()=>{ window.__scrollTo(${yy}); await window.__raf2(); })()`);
            if (process.env.DEBUG) console.error('dbg', yy, await evalJS(`JSON.stringify({sy:scrollY,tr:[...document.querySelectorAll('.work-card__stage')].map(e=>e.style.transform+'|'+getComputedStyle(e).transform), n:ScrollTrigger.getAll().length, lenis:!!window.__lenis})`));
            for (const g of await evalJS(DYN_GAPS)) {
              const c = rec.gaps[g.pair];
              if (!c || g.gap < c.min) rec.gaps[g.pair] = { min: g.gap, y: yy };
            }
          }
          console.error('progress: gaps done', p, w);
          const pairs = Object.entries(rec.gaps);
          if (pairs.length) {
            const [pn, worst] = pairs.sort((a, b) => a[1].min - b[1].min)[0];
            rec.worst = { pair: pn, ...worst };
            await evalJS(`(async()=>{ window.__scrollTo(${worst.y}); await window.__raf2(); })()`);
            rec.gapShot = path.join(OUT, `dyn-${p}-${w}-gap.png`);
            await shotVP(w, h, rec.gapShot);
          }
          console.error('progress: shot done');
          // touch replay
          const list = await evalJS(DYN_TOUCH_LIST);
          for (const it of list) {
            for (const mode of ['swipe', 'tap']) {
              await evalJS(`(async()=>{ window.__scrollTo(0); await window.__raf2(); })()`);
              const pt = await evalJS(DYN_PREP(it.i));
              await touch('touchStart', pt.x, pt.y);
              let mid = null;
              if (mode === 'swipe') {
                for (let k = 1; k <= 3; k++) { await touch('touchMove', pt.x, pt.y - 50 * k); await sleep(60); }
                mid = await evalJS(DYN_STATE(it.i));
              }
              await touch('touchEnd');
              await sleep(800);
              const st = await evalJS(DYN_STATE(it.i));
              const stuck = st.nonId || st.alpha > 0.001;
              const vr = v => ['x','y','a'].every(k => Math.abs(parseFloat(v[k]) || 0) < 1e-6) && Math.abs((parseFloat(v.s) || 1) - 1) < 1e-6;
              rec.touch.push({ el: it.label, mode, stuck, varsAtRest: vr(st.vars) && (!mid || vr(mid.vars)), vars: st.vars, midVars: mid && mid.vars, overlap: st.overlap, scale: st.scale, rot: st.rot, alpha: st.alpha, mid: mid && { scale: mid.scale, rot: mid.rot, alpha: mid.alpha } });
              if (stuck && it.label.startsWith('work-card__link') && !rec.stuckShot) {
                rec.stuckShot = path.join(OUT, `dyn-${p}-${w}-stuck.png`);
                await shotVP(w, h, rec.stuckShot);
              }
              if (!rec.afterShot && it.label.startsWith('work-card__link') && mode === 'swipe') {
                rec.afterShot = path.join(OUT, `dyn-${p}-${w}-aftertouch.png`);
                await shotVP(w, h, rec.afterShot);
              }
            }
          }
          console.error('progress: touch done');
          if (p === 'index') rec.forced = await forcedTest();
        } else if (p === 'index') {
          rec.forced = await forcedTest();
          // desktop mouse tilt test
          const list = await evalJS(DYN_TOUCH_LIST);
          const it = list.find(x => x.label.startsWith('work-card__link'));
          const mv = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
          const pt = await evalJS(DYN_PREP(it.i));
          await mv(pt.x - 60, pt.y - 40); await sleep(100); await mv(pt.x + 80, pt.y + 50); await sleep(600);
          const over = await evalJS(DYN_STATE(it.i));
          await mv(2, 2); await sleep(900);
          const out = await evalJS(DYN_STATE(it.i));
          rec.mouse = { overVars: over.vars, outVars: out.vars, over: { scale: over.scale, rot: over.rot, alpha: over.alpha, nonId: over.nonId }, out: { scale: out.scale, rot: out.rot, alpha: out.alpha, nonId: out.nonId } };
        }
        if (!process.env.CONSOLE_ONLY) rec.errors = [...globalThis.__errs];
        dres.push(rec);
        console.error(`${p} ${w}: gaps=${JSON.stringify(Object.fromEntries(Object.entries(rec.gaps).map(([k, v]) => [k, v.min])))} stuck=${rec.touch.filter(t => t.stuck).length}/${rec.touch.length} mouse=${JSON.stringify(rec.mouse)} errs=${(rec.errors||[]).length}${(rec.errors||[]).length ? JSON.stringify(rec.errors) : ''} varsRest=${rec.touch.filter(t => t.el.startsWith('work-card') && !t.varsAtRest).length ? 'FAIL' : 'ok'} forced=${rec.forced ? JSON.stringify({hoverNone: rec.forced.hoverNone, identity: rec.forced.forcedIdentity, tilts: rec.forced.forcedTilts}) : '-'}`);
      }
    }
  } finally { cleanup(); }
  writeFileSync(path.join(OUT, 'results-dynamic.json'), JSON.stringify(dres, null, 1));
  console.log('page      width  pair/element                 min-gap  stuck  overlap');
  for (const r of dres) {
    for (const [k, v] of Object.entries(r.gaps)) console.log(r.page.padEnd(9), String(r.width).padEnd(6), k.padEnd(28), String(v.min).padEnd(8), '-', '-', `(y=${v.y})`);
    for (const t of r.touch) console.log(r.page.padEnd(9), String(r.width).padEnd(6), (t.el + ' ' + t.mode).padEnd(28), '-'.padEnd(8), (t.stuck ? 'YES' : 'no').padEnd(6), t.overlap);
    if (r.mouse) console.log(r.page.padEnd(9), String(r.width).padEnd(6), 'mouse', JSON.stringify(r.mouse));
  }
  process.exit(0);
}

const results = [];
try {
  for (const [w, h] of VPS) {
    const mobile = w < 1000;
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile, screenWidth: w, screenHeight: h });
    await send('Emulation.setUserAgentOverride', { userAgent: mobile ? UA : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 0 }).catch(() => {});
    await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    for (const p of PAGES) {
      await send('Page.navigate', { url: `${BASE}/${p}.html` });
      await sleep(3000);
      await send('Page.bringToFront');
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile, screenWidth: w, screenHeight: h });
      const height = await evalJS(SETTLE);
      const findings = await evalJS(AUDIT);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true,
        clip: { x: 0, y: 0, width: w, height: Math.min(height, 16000), scale: 1 } });
      const file = path.join(OUT, `${p}-${w}.png`);
      writeFileSync(file, Buffer.from(shot.data, 'base64'));
      results.push({ page: p, width: w, height, screenshot: file, findings });
      console.error(`${p} ${w}: ${findings.length} findings (h=${height})`);
    }
  }
} finally { cleanup(); }

writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
// summary + dedupe
const map = new Map();
for (const r of results) for (const f of r.findings) {
  const k = [r.page, f.type, f.sel].join('|');
  const e = map.get(k) || { page: r.page, type: f.type, sel: f.sel, widths: {}, };
  e.widths[r.width] = { off: f.off, rect: f.rect, note: f.note };
  map.set(k, e);
}
const dedup = [...map.values()];
writeFileSync(path.join(OUT, 'findings-dedup.json'), JSON.stringify(dedup, null, 1));
console.log('page width findings');
for (const r of results) {
  const c = {}; r.findings.forEach(f => c[f.type] = (c[f.type] || 0) + 1);
  console.log(r.page.padEnd(9), String(r.width).padEnd(5), r.findings.length, JSON.stringify(c));
}
console.log('deduped findings:', dedup.length, '-> ' + path.join(OUT, 'findings-dedup.json'));
process.exit(0);
