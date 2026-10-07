#!/usr/bin/env node
// Usage: node qa-check.mjs <baseUrl> <outDir> [AREAS=animation,scroll,click,security] [PAGES=index,services,work,about,contact]
//   (AREAS / PAGES may also be given as env vars or as KEY=value args). Env: PORT=<debug port> (default random), DEBUG=1
// Read-only: headless Chrome with a fresh temp profile over CDP, plus plain fetch() for the security checks.
// The contact form POST is intercepted with Fetch.enable and failed locally (never reaches the server).
// Output: <outDir>/report.json, report.md, shots/*.png (screenshots of failures).
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const kv = Object.fromEntries(process.argv.slice(2).filter(a => /^[A-Z]+=/.test(a)).map(a => [a.split('=')[0], a.slice(a.indexOf('=') + 1)]));
const pos = process.argv.slice(2).filter(a => !/^[A-Z]+=/.test(a));
const BASE = (pos[0] || (console.error('Usage: node qa-check.mjs <baseUrl> [outDir]'), process.exit(1))).replace(/\/$/, '');
const OUT = path.resolve(pos[1] || path.join(process.cwd(), 'qa-out'));
const AREAS = (kv.AREAS || process.env.AREAS || 'animation,scroll,click,security').split(',').map(s => s.trim());
const PAGES = (kv.PAGES || process.env.PAGES || 'index').split(',').map(s => s.trim());
const PORT = +(process.env.PORT || 20000 + Math.floor(Math.random() * 20000));
const DEBUG = !!process.env.DEBUG;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.error(...a);
const dbg = (...a) => DEBUG && console.error('[dbg]', ...a);
const T0 = Date.now();
const url = p => `${BASE}/${p}.html`;
const VP = { m: { w: 390, h: 844, mobile: true }, d: { w: 1373, h: 900, mobile: false } };
const needBrowser = AREAS.some(a => ['animation', 'scroll', 'click'].includes(a));

// ---------------------------------------------------------------- results
const CHECKS = new Map();
const shotCount = {};
let browserUp = false;
async function rec(area, id, title, ctx, pass, measured, offenders = [], opts = {}) {
  const key = area + '/' + id;
  if (!CHECKS.has(key)) CHECKS.set(key, { area, id, title, runs: [] });
  const run = { ctx, pass: !!pass, measured, offenders: offenders.slice(0, 25) };
  if (!pass && browserUp && opts.shot !== false && (shotCount[key] = (shotCount[key] || 0) + 1) <= 3) {
    try {
      const sels = offenders.map(o => (typeof o === 'string' ? o : o.sel)).filter(Boolean).slice(0, 6);
      if (sels.length) await evalJS(`(()=>{const l=${JSON.stringify(sels)};l.forEach((s,i)=>{try{const e=document.querySelector(s);if(!e)return;if(i===0)e.scrollIntoView({block:'center',behavior:'instant'});e.style.outline='3px solid red';e.style.outlineOffset='-3px'}catch{}})})()`).catch(() => {});
      await sleep(150);
      const s = await send('Page.captureScreenshot', { format: 'png' });
      const f = `shots/${area}-${id}-${ctx.replace(/[^\w.-]+/g, '_')}.png`;
      writeFileSync(path.join(OUT, f), Buffer.from(s.data, 'base64'));
      run.shot = f;
    } catch (e) { dbg('shot failed', e.message); }
  }
  CHECKS.get(key).runs.push(run);
  dbg(area, id, ctx, pass ? 'PASS' : 'FAIL', JSON.stringify(measured).slice(0, 200));
}

// ---------------------------------------------------------------- page-side helpers (stringified into the page)
const QH = function () {
  const sel = el => {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.documentElement; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id && /^[\w-]+$/.test(e.id)) { parts.unshift(s + '#' + e.id); break; }
      const c = [...e.classList].filter(x => /^[\w-]+$/.test(x) && !/^(is-|js-|gsap)/.test(x))[0];
      if (c) s += '.' + c;
      if (e.parentElement) {
        const sib = [...e.parentElement.children].filter(x => x.tagName === e.tagName);
        if (sib.length > 1) s += ':nth-of-type(' + (sib.indexOf(e) + 1) + ')';
      }
      parts.unshift(s);
      if (parts.length >= 5) break;
    }
    return parts.join(' > ');
  };
  const eff = el => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const rendered = el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.display !== 'none' && r.width > 0 && r.height > 0; };
  const clipped = (el, vw) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'hidden' || o === 'clip') { const pr = p.getBoundingClientRect(); if (pr.right <= vw + 1 && pr.left >= -1) return true; }
    }
    return false;
  };
  const stopRec = () => { __qa.on = false; return __qa.d; };
  return { sel, eff, rendered, clipped, stopRec };
};
const INIT = `
window.__q=(${QH})();
window.__qa={cls:0,loaf:[],raf:0,d:[],on:false};
(()=>{
  try{new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) __qa.cls+=e.value}).observe({type:'layout-shift',buffered:true})}catch{}
  try{new PerformanceObserver(l=>{for(const e of l.getEntries()) __qa.loaf.push(Math.round(e.duration))}).observe({type:'long-animation-frame',buffered:true})}catch{}
  const raw=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=function(cb){__qa.raf++;return raw(cb)};
  __qa.start=()=>{__qa.d=[];__qa.on=true;let last=0;const loop=t=>{if(!__qa.on)return;if(last)__qa.d.push(t-last);last=t;raw(loop)};raw(loop)};
})();`;

// ---------------------------------------------------------------- chrome + CDP
let chrome, PROFILE, ws;
const pend = new Map(); let mid = 0; const waiters = [];
const ctxState = { label: '', expect: false };
const consoleLog = [], netFail = [];
let formPosts = 0, formIntercept = false;
const reqUrl = new Map();

function cleanup() {
  try { chrome && chrome.kill('SIGKILL'); } catch {}
  if (PROFILE) { try { spawnSync('pkill', ['-9', '-f', PROFILE]); } catch {} try { rmSync(PROFILE, { recursive: true, force: true }); } catch {} }
}
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

const send = (method, params = {}, ms = 15000) => new Promise((res, rej) => {
  const i = ++mid;
  const t = setTimeout(() => { pend.delete(i); rej(new Error('CDP timeout ' + ms / 1000 + 's: ' + method)); }, ms);
  pend.set(i, d => { clearTimeout(t); d.error ? rej(new Error(method + ': ' + d.error.message)) : res(d.result); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evalJS = async (expr, ms = 15000) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, ms);
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};
// run a real function in the page with a JSON argument; helpers (__q) are guaranteed
const ev = (fn, arg = null, ms = 15000) => evalJS(`window.__q||(window.__q=(${QH})());(${fn.toString()})(${JSON.stringify(arg)})`, ms);
const waitEvent = (method, ms = 20000) => new Promise((res, rej) => {
  const w = { method, res, t: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); rej(new Error('event timeout ' + method)); }, ms) };
  waiters.push(w);
});

function onMessage(m) {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); return; }
  const p = d.params || {};
  for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].method === d.method) { clearTimeout(waiters[i].t); waiters[i].res(p); waiters.splice(i, 1); }
  const tag = { page: ctxState.label, expect: ctxState.expect };
  switch (d.method) {
    case 'Runtime.exceptionThrown': consoleLog.push({ ...tag, level: 'exception', text: (p.exceptionDetails.exception?.description || p.exceptionDetails.text || '').slice(0, 200).split('\n')[0] }); break;
    case 'Runtime.consoleAPICalled':
      if (p.type === 'error' || p.type === 'warning') consoleLog.push({ ...tag, level: p.type, text: p.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200) });
      break;
    case 'Log.entryAdded':
      if (p.entry.level === 'error' || p.entry.level === 'warning') consoleLog.push({ ...tag, level: p.entry.level, text: p.entry.text.slice(0, 160) + (p.entry.url ? ' ' + p.entry.url : '') });
      break;
    case 'Network.requestWillBeSent': reqUrl.set(p.requestId, p.request.url); break;
    case 'Network.loadingFailed': {
      const u = reqUrl.get(p.requestId) || '';
      if (p.errorText === 'net::ERR_ABORTED' || p.canceled) break;
      if (/send\.php/.test(u)) break;
      netFail.push({ ...tag, url: u, error: p.errorText + (p.blockedReason ? ' (' + p.blockedReason + ')' : '') });
      break;
    }
    case 'Network.responseReceived':
      if (p.response.status >= 400) netFail.push({ ...tag, url: p.response.url, error: 'HTTP ' + p.response.status });
      break;
    case 'Fetch.requestPaused':
      if (/send\.php/.test(p.request.url) && p.request.method === 'POST') {
        formPosts++;
        send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'Failed' }).catch(() => {});
      } else send('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {});
      break;
    case 'Page.javascriptDialogOpening': send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); break;
  }
}

async function startChrome() {
  PROFILE = mkdtempSync(path.join(tmpdir(), 'qa-'));
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run',
    '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--window-size=1500,1000', 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
    if (!wsUrl) await sleep(300);
  }
  if (!wsUrl) throw new Error('chrome did not start on port ' + PORT);
  ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  ws.addEventListener('message', onMessage);
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await send(m);
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  browserUp = true;
}

async function configure(vp, media = 'no-preference') {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: vp.mobile ? 2 : 1, mobile: vp.mobile, screenWidth: vp.w, screenHeight: vp.h });
  await send('Emulation.setUserAgentOverride', { userAgent: vp.mobile
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
  await send('Emulation.setTouchEmulationEnabled', vp.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: media }] });
  VPcur = vp;
}
let VPcur = VP.d;
async function nav(u, extra = 0) {
  const p = waitEvent('Page.loadEventFired', 25000);
  await send('Page.navigate', { url: u });
  await p.catch(() => {});
  await send('Page.bringToFront').catch(() => {});
  if (extra) await sleep(extra);
}
const wheel = (dy, x, y) => send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: x ?? VPcur.w / 2, y: y ?? VPcur.h / 2, deltaX: 0, deltaY: dy });
const clickAt = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};
const KEYS = { Space: [' ', 'Space', 32, ' '], PageDown: ['PageDown', 'PageDown', 34], End: ['End', 'End', 35], Home: ['Home', 'Home', 36], Tab: ['Tab', 'Tab', 9], Escape: ['Escape', 'Escape', 27], Enter: ['Enter', 'Enter', 13, '\r'] };
const press = async k => {
  const [key, code, vk, text] = KEYS[k];
  await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
};
async function settle(stable = 300, cap = 8000) {
  let last = -1, since = Date.now(); const t0 = Date.now();
  while (Date.now() - t0 < cap) {
    const y = await evalJS('scrollY');
    if (Math.abs(y - last) < 0.5) { if (Date.now() - since >= stable) return y; } else { last = y; since = Date.now(); }
    await sleep(60);
  }
  return last;
}
async function scrollAll() {
  for (let i = 0; i < 90; i++) {
    const s = await evalJS('({y:scrollY,h:document.documentElement.scrollHeight,ih:innerHeight})');
    if (i > 2 && s.y + s.ih >= s.h - 3) break;
    await wheel(500); await sleep(110);
  }
  await sleep(300);
}
const toTop = async () => { await evalJS('document.documentElement.style.scrollBehavior="auto";scrollTo(0,0)'); await sleep(500); await settle(200, 3000); };
const pctl = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const r1 = n => Math.round(n * 100) / 100;
const safe = async (name, fn) => { try { await fn(); } catch (e) { log(`  ! ${name}: ${e.message}`); await rec('meta', 'harness-error', 'Harness errors (check did not complete)', name, false, e.message.slice(0, 200), [], { shot: false }); } };

// ---------------------------------------------------------------- page-side check functions
const revealCheck = ({ onlyViewport }) => {
  const q = __q; const bad = []; let n = 0;
  for (const el of document.querySelectorAll('[data-reveal],[class*="hero"]')) {
    if (el.tagName === 'CANVAS' || !q.rendered(el)) continue;
    if (el.closest('[aria-hidden="true"]') && !el.hasAttribute('data-reveal')) continue;
    const r = el.getBoundingClientRect();
    if (onlyViewport && !(r.top < innerHeight * 0.7 && r.bottom > 0)) continue;
    n++;
    const o = q.eff(el), v = getComputedStyle(el).visibility;
    if (o < 0.99 || v !== 'visible') bad.push({ sel: q.sel(el), opacity: Math.round(o * 100) / 100, visibility: v });
  }
  return { n, bad };
};
const movingAnims = () => {
  const out = [];
  for (const a of document.getAnimations()) {
    try {
      const t = a.effect?.getComputedTiming?.(); if (!t) continue;
      const dur = t.duration === 'auto' ? 0 : +t.duration;
      const props = new Set((a.effect.getKeyframes?.() || []).flatMap(k => Object.keys(k)));
      if (!['transform', 'translate', 'scale', 'rotate'].some(p => props.has(p))) continue;
      if (dur / 1000 > 0.05 && a.playState === 'running') out.push({ sel: a.effect.target ? __q.sel(a.effect.target) : '?', duration: dur, name: a.animationName || a.transitionProperty || 'waapi', iterations: t.iterations });
    } catch {}
  }
  return out;
};
const textZero = () => {
  const q = __q; const bad = []; let n = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || !q.rendered(el)) continue;
    if (![...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim().length)) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    n++;
    const o = q.eff(el);
    if (o < 0.01) bad.push({ sel: q.sel(el), text: el.textContent.trim().slice(0, 40) });
  }
  return { n, bad };
};
const stSnap = () => window.ScrollTrigger ? ScrollTrigger.getAll().map(s => ({ sel: __q.sel(s.trigger || s.pin || document.body), s: Math.round(s.start * 10) / 10, e: Math.round(s.end * 10) / 10 })) : null;
const hitTest = ({ only }) => {
  const q = __q, vw = innerWidth, vh = innerHeight; const items = []; let skipped = 0;
  document.documentElement.style.scrollBehavior = 'auto';
  const burger = document.querySelector('#navBurger');
  const burgerVisible = burger && getComputedStyle(burger).display !== 'none' && burger.getBoundingClientRect().width > 0;
  const closed = burgerVisible && burger.getAttribute('aria-expanded') !== 'true';
  for (const el of document.querySelectorAll('a[href],button,[role=button],input[type=submit]')) {
    const inNav = !!el.closest('#siteNav');
    if (only === 'nav' && !inNav) continue;
    if (closed && el.closest('.nav__links,.nav__menu,.mobile-menu,[class*="menu"]') && el !== burger) { skipped++; continue; }
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.disabled) continue;
    let r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if (el.closest('[aria-hidden="true"],[inert]') || el.tabIndex < 0 && el.closest('[aria-hidden]')) { skipped++; continue; }
    const fixed = (() => { for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true; return false; })();
    if (!fixed) { scrollTo(0, Math.max(0, r.top + scrollY - vh / 2 + r.height / 2)); r = el.getBoundingClientRect(); }
    const l = Math.max(0, r.left), rt = Math.min(vw, r.right), t = Math.max(0, r.top), b = Math.min(vh, r.bottom);
    if (rt - l < 1 || b - t < 1) { skipped++; continue; }
    const x = (l + rt) / 2, y = (t + b) / 2;
    const hit = document.elementFromPoint(x, y);
    const ok = !!hit && (hit === el || el.contains(hit));
    const inline = el.tagName === 'A' && cs.display === 'inline';
    items.push({ sel: q.sel(el), text: (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, ok, hit: ok ? '' : q.sel(hit || document.body), inline });
  }
  scrollTo(0, 0);
  return { items, skipped };
};
const overflowCheck = () => {
  const q = __q, vw = document.documentElement.clientWidth, de = document.documentElement;
  const off = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (/^(SCRIPT|STYLE|PATH|BR|LINE|CIRCLE|G|DEFS)$/i.test(el.tagName)) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if (r.right > vw + 1 && r.left > -1000 && !q.clipped(el, vw)) off.push({ sel: q.sel(el), right: Math.round(r.right), left: Math.round(r.left), over: Math.round(r.right - vw) });
  }
  off.sort((a, b) => b.over - a.over);
  return { vw, scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth, htmlOverflow: de.scrollWidth - vw, offenders: off.slice(0, 12), nOff: off.length };
};
const tabInfo = () => {
  const el = document.activeElement; const q = __q;
  if (!el || el === document.body || el === document.documentElement) return null;
  if (el.__qaid == null) el.__qaid = (window.__qaN = (window.__qaN || 0) + 1);
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const first = window.__qaFirst || (window.__qaFirst = el);
  return { id: el.__qaid, sel: q.sel(el), ow: parseFloat(cs.outlineWidth) || 0, os: cs.outlineStyle, oc: cs.outlineColor, bs: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 50),
    inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, first: first === el,
    follows: window.__qaPrev ? !!(window.__qaPrev.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) : true, _p: (window.__qaPrev = el, 0) };
};
const linkList = () => [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), abs: a.href, target: a.target, rel: a.rel, sel: __q.sel(a), vis: a.getBoundingClientRect().width > 0 }));
const formInfo = () => {
  const f = document.querySelector('form'); if (!f) return null;
  const q = __q;
  const fields = [...f.querySelectorAll('input,textarea,select')].filter(e => !/^(hidden|submit|button|reset|image)$/.test(e.type)).map(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    const honeypot = r.left < -500 || r.width < 2 || r.height < 2 || cs.display === 'none' || e.tabIndex < 0 && e.closest('[aria-hidden="true"]');
    const lb = e.labels && e.labels.length || e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') || '').split(' ').some(i => document.getElementById(i)?.textContent.trim());
    return { sel: q.sel(e), name: e.name, type: e.type, autocomplete: e.getAttribute('autocomplete') || '', required: e.required || e.getAttribute('aria-required') === 'true', labelled: !!lb, honeypot: !!honeypot };
  });
  const sub = f.querySelector('[type=submit],button:not([type=button])');
  const sr = sub && sub.getBoundingClientRect();
  return { fields, submit: sub ? { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2, sel: q.sel(sub) } : null, action: f.getAttribute('action'), method: f.method };
};
const formPrep = () => { const f = document.querySelector('form'); const s = f.querySelector('[type=submit],button:not([type=button])'); document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight / 2); const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, dis: s.disabled }; };
const formInvalid = () => {
  const f = document.querySelector('form'); const q = __q;
  const req = [...f.querySelectorAll('input,textarea,select')].filter(e => (e.required || e.getAttribute('aria-required') === 'true') && !/^(hidden|submit|button)$/.test(e.type) && e.getBoundingClientRect().left > -500);
  const flagged = [], silent = [];
  for (const e of req) {
    const desc = (e.getAttribute('aria-describedby') || '').split(' ').map(i => document.getElementById(i)?.textContent.trim()).some(Boolean);
    (e.getAttribute('aria-invalid') === 'true' || desc ? flagged : silent).push(q.sel(e));
  }
  const live = [...document.querySelectorAll('[role=alert],[role=status],[aria-live]')].map(e => e.textContent.trim()).filter(Boolean);
  return { requiredEmpty: req.length, flagged: flagged.length, silent, liveText: live.map(t => t.slice(0, 60)) };
};
const formFill = () => {
  const f = document.querySelector('form');
  const set = (e, v) => { const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  for (const e of f.querySelectorAll('input,textarea,select')) {
    if (/^(hidden|submit|button)$/.test(e.type) || e.getBoundingClientRect().left < -500 || e.getBoundingClientRect().width < 2) continue;
    if (e.type === 'checkbox' || e.type === 'radio') { e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (e.tagName === 'SELECT') { const o = [...e.options].find(o => o.value); if (o) { e.value = o.value; e.dispatchEvent(new Event('change', { bubbles: true })); } }
    else if (e.type === 'date') set(e, '2030-01-15');
    else if (e.type === 'time') set(e, '10:00');
    else if (e.type === 'email' || /mail/i.test(e.name)) set(e, 'qa-check@example.invalid');
    else if (e.type === 'tel' || /phone|tel/i.test(e.name)) set(e, '+3725550000');
    else if (e.type === 'url' || /site|url|web/i.test(e.name)) set(e, 'https://example.invalid');
    else if (e.tagName === 'TEXTAREA') set(e, 'QA check, automated test. Please ignore.');
    else set(e, 'QA Check');
  }
};
const mixedScan = () => 0;

// ---------------------------------------------------------------- AREA: animation
async function animation() {
  log('== animation');
  for (const page of PAGES) for (const media of ['no-preference', 'reduce']) for (const vk of ['m', 'd']) {
    const vp = VP[vk], ctx = `${page}@${vp.w}/${media === 'reduce' ? 'reduce' : 'motion'}`;
    await safe('anim ' + ctx, async () => {
      ctxState.label = ctx;
      await configure(vp, media);
      await nav(url(page), 2500);
      const mv = [];
      const reveal1 = await ev(revealCheck, { onlyViewport: true });
      await rec('animation', 'reveal-load', 'Hero/[data-reveal] in the first viewport at opacity >=0.99 and visible after load', ctx, reveal1.bad.length === 0, { checked: reveal1.n, bad: reveal1.bad.length }, reveal1.bad);
      mv.push(...await ev(movingAnims));
      if (media === 'no-preference' && vk === 'd') {
        await ev(() => __qa.start());
        for (let i = 0; i < 45; i++) { await wheel(50); await sleep(55); }
        const d = await ev(() => __q.stopRec());
        const p95 = pctl(d, 0.95);
        await rec('animation', 'raf-p95', 'p95 rAF delta <=20ms while scrolling the hero (no-preference, 1373; headless = software GL)', ctx, p95 <= 20, { p95ms: r1(p95), p50ms: r1(pctl(d, 0.5)), max: r1(Math.max(0, ...d)), frames: d.length });
        await toTop();
      }
      await scrollAll();
      await sleep(2000);
      const reveal2 = await ev(revealCheck, { onlyViewport: false });
      await rec('animation', 'reveal-scroll', 'Every hero/[data-reveal] element at opacity >=0.99 and visible after scrolling (+2s)', ctx, reveal2.bad.length === 0, { checked: reveal2.n, bad: reveal2.bad.length }, reveal2.bad);
      await ev(() => { __qa.raf = 0; });
      await sleep(3000);
      const raf = await evalJS('__qa.raf');
      const g = await evalJS('window.gsap?gsap.globalTimeline.getChildren(false,true,true).filter(t=>t.isActive()).map(t=>t.vars&&t.vars.id||"tween").length:null');
      await rec('animation', 'gsap-idle', 'gsap.globalTimeline active children = 0, 5s after the last scroll', ctx, g === null || g === 0, { active: g, gsap: g !== null });
      await rec('animation', 'offscreen-raf', 'requestAnimationFrame calls/s from the page ~0 at the footer (<=2/s)', ctx, raf / 3 <= 2, { callsPerSec: r1(raf / 3) }, [], { shot: false });
      mv.push(...await ev(movingAnims));
      if (media === 'reduce') {
        const seen = [...new Map(mv.map(m => [m.sel + m.name, m])).values()];
        await rec('animation', 'reduce-moving', 'reduce: no getAnimations() moving transform >0.05s', ctx, seen.length === 0, { moving: seen.length }, seen.map(m => ({ sel: m.sel, note: `${m.name} ${m.duration}ms x${m.iterations}` })));
      }
      const cls = await evalJS('__qa.cls'), loaf = await evalJS('__qa.loaf');
      await rec('animation', 'cls', 'CLS <=0.1 (buffered observer, load + full scroll)', ctx, cls <= 0.1, { cls: r1(cls * 1000) / 1000 }, [], { shot: false });
      const big = loaf.filter(x => x > 200);
      await rec('animation', 'loaf', 'long-animation-frame >200ms: <=1', ctx, big.length <= 1, { over200ms: big.length, values: big.slice(0, 8), worst: Math.max(0, ...loaf) }, [], { shot: false });
    });
  }
  // no-JS and CDN-blocked
  for (const mode of ['nojs', 'cdnblock']) for (const page of PAGES) for (const vk of ['m', 'd']) {
    const vp = VP[vk], ctx = `${page}@${vp.w}/${mode}`;
    await safe('anim ' + ctx, async () => {
      ctxState.label = ctx; ctxState.expect = true;
      await configure(vp, 'no-preference');
      if (mode === 'nojs') await send('Emulation.setScriptExecutionDisabled', { value: true });
      else await send('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*', '*unpkg.com*', '*cdnjs.cloudflare.com*'] });
      await nav(url(page), mode === 'nojs' ? 1500 : 5000);
      const r = await ev(textZero);
      await rec('animation', mode === 'nojs' ? 'nojs-text' : 'cdnblock-text', mode === 'nojs' ? 'No-JS: 0 text elements at opacity 0' : 'CDN blocked (gsap/lenis/three hosts): 0 text elements at opacity 0', ctx, r.bad.length === 0, { textElements: r.n, atOpacity0: r.bad.length }, r.bad);
      if (mode === 'nojs') await send('Emulation.setScriptExecutionDisabled', { value: false });
      else await send('Network.setBlockedURLs', { urls: [] });
      ctxState.expect = false;
    });
    ctxState.expect = false;
    await send('Emulation.setScriptExecutionDisabled', { value: false }).catch(() => {});
    await send('Network.setBlockedURLs', { urls: [] }).catch(() => {});
  }
}

// ---------------------------------------------------------------- AREA: scroll
const coldTargets = new Map();
async function scrollArea() {
  log('== scroll');
  const anchorList = ({ nav }) => {
    const here = location.pathname.replace(/\/(index\.html)?$/, '') || '';
    const out = new Map();
    for (const a of document.querySelectorAll('a[href*="#"]')) {
      let u; try { u = new URL(a.href); } catch { continue; }
      if (u.origin !== location.origin || u.hash.length < 2) continue;
      const p = u.pathname.replace(/\/(index\.html)?$/, '') || '';
      out.set(u.pathname + u.hash, { path: u.pathname, id: decodeURIComponent(u.hash.slice(1)), same: p === here, sel: __q.sel(a) });
    }
    return [...out.values()].filter(l => !/skip/i.test(l.sel) && !/^main$/i.test(l.id));
  };
  for (const vk of ['d', 'm']) for (const page of PAGES) {
    const vp = VP[vk], ctx = `${page}@${vp.w}`;
    await safe('anchors ' + ctx, async () => {
      ctxState.label = ctx; await configure(vp); await nav(url(page), 3500);
      const links = await ev(anchorList, {});
      for (const l of links) coldTargets.set(l.path + '#' + l.id, l);
      const bad = [], vals = [];
      for (const l of links.filter(l => l.same)) {
        await toTop();
        const res = await ev(({ id, sel }) => {
          const t = document.getElementById(id); if (!t) return { missing: true };
          document.querySelector(sel)?.click(); return { missing: false };
        }, { id: l.id, sel: l.sel });
        if (res.missing) { bad.push({ sel: '#' + l.id, note: 'target id missing' }); continue; }
        await sleep(300); await settle(300, 6000);
        const m = await ev(({ id }) => { const t = document.getElementById(id), n = document.querySelector('#siteNav,header.site-nav,header'); const nb = n ? n.getBoundingClientRect().bottom : 0; return { delta: t.getBoundingClientRect().top - nb, y: scrollY, max: document.documentElement.scrollHeight - innerHeight }; }, { id: l.id });
        const limited = m.y >= m.max - 2 && m.delta > 24;
        vals.push({ id: l.id, delta: Math.round(m.delta * 10) / 10, limited });
        if (!limited && (m.delta < -2 || m.delta > 24)) bad.push({ sel: '#' + l.id, note: `target top - nav bottom = ${Math.round(m.delta * 10) / 10}px (via ${l.sel})` });
      }
      await rec('scroll', 'anchor-click', 'Same-page #anchor links land target top at nav bottom -2..+24px after scroll idle', ctx, bad.length === 0, { links: vals.length, deltas: vals.map(v => `${v.id}:${v.delta}${v.limited ? '(bottom-limited)' : ''}`).join(' ') }, bad);
    });
  }
  // cold loads
  for (const vk of ['d', 'm']) {
    const vp = VP[vk]; await configure(vp);
    const bad = []; const vals = [];
    for (const [k, l] of coldTargets) {
      await safe('cold ' + k, async () => {
        ctxState.label = k;
        await nav('about:blank'); await nav(BASE + k, 2500); await settle(300, 8000);
        const m = await ev(({ id }) => { const t = document.getElementById(id), n = document.querySelector('#siteNav,header.site-nav,header'); if (!t) return null; return { delta: t.getBoundingClientRect().top - (n ? n.getBoundingClientRect().bottom : 0), y: scrollY, max: document.documentElement.scrollHeight - innerHeight }; }, { id: l.id });
        if (!m) { bad.push({ sel: k, note: 'target missing' }); return; }
        const limited = m.y >= m.max - 2 && m.delta > 24;
        vals.push(`${k}:${Math.round(m.delta)}${limited ? '(bottom-limited)' : ''}`);
        if (!limited && (m.delta < -2 || m.delta > 24)) bad.push({ sel: k, note: `target top - nav bottom = ${Math.round(m.delta * 10) / 10}px` });
      });
    }
    await rec('scroll', 'anchor-cold', 'Cold load of page#id lands target top at nav bottom -2..+24px after scroll idle', `${vp.w}`, bad.length === 0, { urls: coldTargets.size, deltas: vals.join(' ') }, bad);
  }
  // keys + wheel
  for (const page of PAGES) await safe('keys ' + page, async () => {
    const vp = VP.d, ctx = `${page}@${vp.w}`; ctxState.label = ctx;
    await configure(vp); await nav(url(page), 3500); await toTop();
    const maxY = await evalJS('document.documentElement.scrollHeight-innerHeight');
    if (maxY < 200) { await rec('scroll', 'keys', 'Space/PageDown/End/Home and the wheel change scrollY', ctx, true, { note: 'page not scrollable' }); return; }
    const res = {}; const bad = [];
    const step = async (name, act, test) => { const before = await evalJS('scrollY'); await act(); await sleep(1300); await settle(200, 4000); const after = await evalJS('scrollY'); res[name] = `${Math.round(before)}->${Math.round(after)}`; if (!test(before, after)) bad.push({ sel: name, note: res[name] }); };
    await step('wheel', () => wheel(500), (b, a) => a > b + 20);
    await toTop(); await step('Space', () => press('Space'), (b, a) => a > b + 20);
    await step('PageDown', () => press('PageDown'), (b, a) => a > b + 20);
    await step('End', () => press('End'), (b, a) => a > maxY - 60);
    await step('Home', () => press('Home'), (b, a) => a < 5);
    await rec('scroll', 'keys', 'Space/PageDown/End/Home and the wheel change scrollY', ctx, bad.length === 0, res, bad);
  });
  // back restore
  for (const page of PAGES) await safe('back ' + page, async () => {
    const vp = VP.d, ctx = `${page}@${vp.w}`; ctxState.label = ctx;
    await configure(vp); await nav(url(page), 3500); await toTop();
    const maxY = await evalJS('document.documentElement.scrollHeight-innerHeight');
    if (maxY < 400) { await rec('scroll', 'back-restore', 'Back from a subpage restores scrollY within 50px', ctx, true, { note: 'page not scrollable' }); return; }
    const target = Math.min(1500, maxY / 2);
    for (let i = 0; i < 40; i++) { const y = await evalJS('scrollY'); if (y >= target) break; await wheel(300); await sleep(100); }
    const y0 = await settle(300, 5000);
    const clicked = await ev(({ page }) => { const a = [...document.querySelectorAll('a[href]')].find(a => { const u = new URL(a.href); return u.origin === location.origin && !u.hash && u.pathname !== location.pathname && !/^\/?$/.test(u.pathname) === !/index/.test(page) || (u.origin === location.origin && !u.hash && u.pathname !== location.pathname && a.getBoundingClientRect().width > 0); }); if (!a) return null; a.click(); return a.getAttribute('href'); }, { page });
    if (!clicked) { await rec('scroll', 'back-restore', 'Back from a subpage restores scrollY within 50px', ctx, true, { note: 'no internal link' }); return; }
    await sleep(1000);
    for (let i = 0; i < 30 && (await evalJS('location.pathname')).endsWith(page + '.html'); i++) await sleep(250);
    await sleep(2000);
    await evalJS('history.back()');
    await sleep(2500);
    const y1 = await settle(300, 5000);
    const back = (await evalJS('location.pathname')).endsWith(page + '.html') || (page === 'index' && /\/(index\.html)?$/.test(await evalJS('location.pathname')));
    await rec('scroll', 'back-restore', 'Back from a subpage restores scrollY within 50px', ctx, back && Math.abs(y1 - y0) <= 50, { before: Math.round(y0), after: Math.round(y1), diff: Math.round(y1 - y0), via: clicked, returned: back });
  });
  // overflow
  for (const page of PAGES) for (const w of [320, 375, 768, 1024, 1440]) await safe(`overflow ${page}@${w}`, async () => {
    const ctx = `${page}@${w}`; ctxState.label = ctx;
    await configure({ w, h: w < 768 ? 800 : 900, mobile: w <= 768 });
    await nav(url(page), 2500);
    const o = await ev(overflowCheck);
    await rec('scroll', 'overflow-x', 'No horizontal overflow at 320/375/768/1024/1440', ctx, o.htmlOverflow <= 0 && o.nOff === 0, { scrollWidth: o.scrollWidth, clientWidth: o.vw, bodyScrollWidth: o.bodyScrollWidth, offenders: o.nOff }, o.offenders.map(x => ({ sel: x.sel, note: `right=${x.right} left=${x.left} over=${x.over}px` })));
  });
  // ScrollTrigger stability
  for (const page of PAGES) for (const vk of ['d', 'm']) await safe(`st ${page}`, async () => {
    const vp = VP[vk], ctx = `${page}@${vp.w}`; ctxState.label = ctx;
    await configure(vp);
    const dcl = waitEvent('Page.domContentEventFired', 25000).catch(() => {});
    await nav(url(page));
    const A = await ev(stSnap);
    if (A === null) { await rec('scroll', 'st-stable', 'ScrollTrigger start/end stable (+-2px) before/after fonts+images and after resize', ctx, true, { note: 'no ScrollTrigger' }); return; }
    await evalJS('document.querySelectorAll("img[loading=lazy]").forEach(i=>i.loading="eager")');
    await evalJS('Promise.race([document.fonts.ready.then(()=>Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r})))),new Promise(r=>setTimeout(r,9000)))]', 12000).catch(() => {});
    await sleep(1200);
    const B = await ev(stSnap);
    await configure({ ...vp, w: vp.w - 150 }); await sleep(1200);
    await configure(vp); await sleep(1800);
    const C = await ev(stSnap);
    const cmp = (X, Y) => { const off = []; if (X.length !== Y.length) off.push({ sel: 'ScrollTrigger count', note: `${X.length} vs ${Y.length}` }); X.forEach((x, i) => { const y = Y[i]; if (!y) return; const d = Math.max(Math.abs(x.s - y.s), Math.abs(x.e - y.e)); if (d > 2) off.push({ sel: x.sel, note: `start ${x.s}->${y.s} end ${x.e}->${y.e} (${r1(d)}px)` }); }); return off; };
    const o1 = cmp(A, B).map(o => ({ ...o, note: 'load->fonts/images: ' + o.note })), o2 = cmp(B, C).map(o => ({ ...o, note: 'resize: ' + o.note }));
    await rec('scroll', 'st-stable', 'ScrollTrigger start/end stable (+-2px) before/after fonts+images and after resize', ctx, !o1.length && !o2.length, { triggers: A.length, shiftedAfterLoad: o1.length, shiftedAfterResize: o2.length }, [...o1, ...o2]);
  });
}

// ---------------------------------------------------------------- AREA: click
let axeSrc = null;
async function clickArea() {
  log('== click');
  const allLinks = new Map();
  for (const vk of ['m', 'd']) for (const page of PAGES) await safe(`hit ${page}@${VP[vk].w}`, async () => {
    const vp = VP[vk], ctx = `${page}@${vp.w}`; ctxState.label = ctx;
    await configure(vp); await nav(url(page), 3500);
    if (vk === 'd') for (const l of await ev(linkList)) allLinks.set(page + '|' + l.href, { ...l, page });
    let res = await ev(hitTest, { only: null }); let items = res.items;
    if (vk === 'm') {
      const b = await evalJS('(()=>{const b=document.querySelector("#navBurger");if(!b)return null;const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()');
      if (b) {
        await clickAt(b.x, b.y); await sleep(900);
        const r2 = await ev(hitTest, { only: 'nav' }); items = items.concat(r2.items.map(i => ({ ...i, menu: true })));
        await clickAt(b.x, b.y); await sleep(500);
      }
    }
    const miss = items.filter(i => !i.ok);
    await rec('click', 'hit-test', 'elementFromPoint at the centre of every a/button/[role=button]/input[type=submit] is itself or a descendant (390 + 1373; burger menu opened at 390)', ctx, miss.length === 0, { tested: items.length, blocked: miss.length, skipped: res.skipped }, miss.map(i => ({ sel: i.sel, note: `"${i.text}" covered by ${i.hit}` })));
    const small = items.filter(i => !i.inline && (i.w < 24 || i.h < 24));
    await rec('click', 'target-24', 'Target size >=24x24px (WCAG 2.5.8; inline text links exempt)', ctx, small.length === 0, { tested: items.length, under24: small.length }, small.map(i => ({ sel: i.sel, note: `"${i.text}" ${i.w}x${i.h}` })));
    const s44 = items.filter(i => !i.inline && (i.w < 44 || i.h < 44) && !(i.w < 24 || i.h < 24));
    await rec('click', 'target-44-info', 'INFO (not a WCAG AA failure): targets <44px (24..43px band) ', ctx, true, { between24and44: s44.length, under24: small.length }, s44.map(i => ({ sel: i.sel, note: `"${i.text}" ${i.w}x${i.h}` })), { shot: false });
  });
  // tab sweep, esc
  for (const page of PAGES) await safe('tab ' + page, async () => {
    const vp = VP.d, ctx = `${page}@${vp.w}`; ctxState.label = ctx;
    await configure(vp); await nav(url(page), 3500); await toTop();
    await evalJS('document.activeElement&&document.activeElement.blur()');
    const stops = []; let trap = null, wrapped = false;
    for (let i = 0; i < 130; i++) {
      await press('Tab'); await sleep(35);
      const t = await ev(tabInfo);
      if (!t) { wrapped = true; break; }
      if (stops.length && t.first && stops.length > 1) { wrapped = true; break; }
      const last = stops[stops.length - 1];
      if (last && last.id === t.id) { last.reps = (last.reps || 1) + 1; if (last.reps > 8) { trap = t.sel; break; } continue; }
      stops.push(t);
    }
    if (!wrapped && !trap) trap = 'no cycle within 130 Tab presses';
    const noOutline = stops.filter(s => !(s.ow >= 2 && s.os !== 'none' && !/rgba\(\d+, \d+, \d+, 0\)/.test(s.oc)));
    const ooo = stops.filter((s, i) => i > 0 && !s.follows);
    const hidden = stops.filter(s => !s.inView);
    await rec('click', 'tab-outline', 'Tab sweep: every focused element shows a visible outline >=2px', ctx, noOutline.length === 0, { stops: stops.length, withoutOutline2px: noOutline.length }, noOutline.map(s => ({ sel: s.sel, note: `outline ${s.ow}px ${s.os}${s.bs ? ', box-shadow ' + s.bs : ''}` })));
    await rec('click', 'tab-trap', 'Tab sweep: no keyboard trap (focus cycles out)', ctx, !trap, { stops: stops.length, wrapped, trap }, trap ? [{ sel: trap }] : []);
    await rec('click', 'tab-order', 'Tab sweep: focus order follows DOM order, focus stays on-screen', ctx, ooo.length === 0 && hidden.length === 0, { stops: stops.length, outOfOrder: ooo.length, offscreenFocus: hidden.length, order: stops.map(s => s.sel.split(' > ').pop()).join(' | ').slice(0, 600) }, [...ooo.map(s => ({ sel: s.sel, note: 'out of DOM order' })), ...hidden.map(s => ({ sel: s.sel, note: 'focused but not in viewport' }))]);
  });
  for (const page of PAGES) await safe('esc ' + page, async () => {
    const vp = VP.m, ctx = `${page}@${vp.w}`; ctxState.label = ctx;
    await configure(vp); await nav(url(page), 3500);
    const b = await evalJS('(()=>{const b=document.querySelector("#navBurger");if(!b||!b.getBoundingClientRect().width)return null;const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,h:history.length,u:location.href}})()');
    if (!b) { await rec('click', 'menu-esc', 'Esc closes the burger menu and returns focus to it; menu adds 0 history entries', ctx, false, { note: 'no visible #navBurger' }); return; }
    await clickAt(b.x, b.y); await sleep(900);
    const open = await evalJS('({exp:document.querySelector("#navBurger").getAttribute("aria-expanded"),h:history.length,u:location.href})');
    await press('Escape'); await sleep(900);
    const closed = await evalJS('({exp:document.querySelector("#navBurger").getAttribute("aria-expanded"),focusIsBurger:document.activeElement===document.querySelector("#navBurger"),active:document.activeElement?document.activeElement.tagName+"#"+document.activeElement.id:"",h:history.length,u:location.href})');
    const ok = open.exp === 'true' && closed.exp === 'false' && closed.focusIsBurger;
    await rec('click', 'menu-esc', 'Esc closes the burger menu and returns focus to it', ctx, ok, { expandedWhenOpen: open.exp, expandedAfterEsc: closed.exp, focusOn: closed.active });
    await rec('click', 'menu-history', 'The menu adds 0 history entries', ctx, open.h === b.h && closed.h === b.h && open.u === b.u && closed.u === b.u, { historyBefore: b.h, open: open.h, afterEsc: closed.h, urlChanged: open.u !== b.u || closed.u !== b.u }, [], { shot: false });
  });
  // links
  await safe('links', async () => {
    ctxState.label = 'links';
    const bodies = new Map(), status = new Map(), bad = [], blank = [];
    const fetchPage = async u => { if (bodies.has(u)) return; try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(20000) }); status.set(u, r.status); bodies.set(u, r.status === 200 ? await r.text() : ''); } catch (e) { status.set(u, 'ERR ' + e.message); bodies.set(u, ''); } };
    const uniq = new Set(); let total = 0;
    for (const l of allLinks.values()) {
      if (/^(mailto:|tel:|javascript:)/i.test(l.href)) continue;
      let u; try { u = new URL(l.abs); } catch { continue; }
      if (l.target === '_blank' && !/\b(noopener|noreferrer)\b/i.test(l.rel)) blank.push({ sel: l.sel, note: `${l.page}: target=_blank rel="${l.rel}" -> ${u.href}` });
      if (u.origin !== new URL(BASE).origin) continue;
      total++;
      const key = u.origin + u.pathname + u.search;
      uniq.add(key);
      l.key = key; l.hash = u.hash;
    }
    for (const k of uniq) await fetchPage(k);
    await fetchPage(url('index'));
    for (const k of uniq) if (status.get(k) !== 200) bad.push({ sel: k, note: 'status ' + status.get(k) });
    const idBad = [];
    for (const l of allLinks.values()) {
      if (!l.key || !l.hash || l.hash.length < 2) continue;
      const id = decodeURIComponent(l.hash.slice(1));
      const body = bodies.get(l.key) || '';
      if (!new RegExp(`\\sid=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(body)) idBad.push({ sel: l.sel, note: `${l.page}: ${l.href} -> #${id} not found in ${l.key}` });
    }
    await rec('click', 'links-200', 'Internal links return 200', 'all pages', bad.length === 0, { uniqueUrls: uniq.size, links: total, failing: bad.length }, bad, { shot: false });
    await rec('click', 'links-ids', 'Every #id link target resolves', 'all pages', idBad.length === 0, { failing: idBad.length }, idBad, { shot: false });
    await rec('click', 'blank-noopener', 'target=_blank links have rel noopener', 'all pages', blank.length === 0, { failing: blank.length }, blank, { shot: false });
  });
  // form
  if (PAGES.includes('contact')) await safe('form', async () => {
    const vp = VP.d, ctx = `contact@${vp.w}`; ctxState.label = ctx;
    await configure(vp); await nav(url('contact'), 3500);
    const info = await ev(formInfo);
    if (!info) { await rec('click', 'form-labels', 'Form: every visible field has a label', ctx, false, { note: 'no <form> on contact page' }); return; }
    const vis = info.fields.filter(f => !f.honeypot);
    const nolabel = vis.filter(f => !f.labelled);
    await rec('click', 'form-labels', 'Form: every visible field has a programmatic label', ctx, nolabel.length === 0, { fields: vis.length, unlabelled: nolabel.length }, nolabel.map(f => ({ sel: f.sel, note: f.name })));
    const ac = [], want = { name: 'name', email: 'email', tel: 'tel' };
    for (const f of vis) {
      const kind = f.type === 'email' || /e-?mail/i.test(f.name) ? 'email' : f.type === 'tel' || /phone|tel/i.test(f.name) ? 'tel' : /^(name|full.?name|your.?name)$/i.test(f.name) ? 'name' : null;
      if (kind && !new RegExp(`\\b${want[kind]}\\b`).test(f.autocomplete)) ac.push({ sel: f.sel, note: `${kind} field has autocomplete="${f.autocomplete}"` });
    }
    await rec('click', 'form-autocomplete', 'Form: autocomplete on name/email/tel fields', ctx, ac.length === 0, { fields: vis.map(f => `${f.name}:${f.autocomplete || '-'}`).join(' ') }, ac);
    await send('Fetch.enable', { patterns: [{ urlPattern: '*send.php*', requestStage: 'Request' }] });
    formIntercept = true; formPosts = 0;
    const p = await ev(formPrep); await sleep(400);
    await clickAt(p.x, p.y); await sleep(1000);
    const inv = await ev(formInvalid);
    const empties = formPosts;
    const ann = inv.requiredEmpty === 0 ? inv.liveText.length > 0 : (inv.silent.length === 0 || (inv.liveText.length > 0 && empties === 0));
    await rec('click', 'form-required-announced', 'Form: empty submit announces required/invalid fields (aria-invalid/aria-describedby or role=alert/status)', ctx, ann, { requiredFields: inv.requiredEmpty, withAriaInvalidOrDescribedby: inv.flagged, liveRegionText: inv.liveText.join(' / ').slice(0, 120), postsOnEmptySubmit: empties }, inv.silent.map(s => ({ sel: s, note: 'no aria-invalid/describedby' })));
    await rec('click', 'form-empty-no-post', 'Form: submitting an empty form does not POST (client-side validation)', ctx, empties === 0, { postsOnEmptySubmit: empties }, [], { shot: false });
    await ev(formFill); await sleep(300);
    const p2 = await ev(formPrep); await sleep(300);
    formPosts = 0;
    for (let i = 0; i < 5; i++) await clickAt(p2.x, p2.y);
    await sleep(2000);
    await rec('click', 'form-double-submit', 'Form: 5 rapid submit clicks -> <=1 POST attempt (POST intercepted + failed locally)', ctx, formPosts <= 1, { postAttempts: formPosts, submitDisabledAtStart: p2.dis }, [], { shot: false });
    await send('Fetch.disable').catch(() => {}); formIntercept = false;
  });
  // axe
  await safe('axe', async () => {
    try { axeSrc = await (await fetch('https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js', { signal: AbortSignal.timeout(30000) })).text(); } catch (e) { await rec('click', 'axe', 'axe-core wcag2a/aa/22aa', 'all', false, { error: 'could not fetch axe: ' + e.message }, [], { shot: false }); return; }
    for (const vk of ['d', 'm']) for (const page of PAGES) await safe(`axe ${page}`, async () => {
      const vp = VP[vk], ctx = `${page}@${vp.w}`; ctxState.label = ctx;
      await configure(vp); await nav(url(page), 3000); await scrollAll(); await sleep(1500); await toTop();
      await evalJS(axeSrc, 30000);
      const v = await evalJS(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag22aa']},resultTypes:['violations']}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.length,targets:v.nodes.slice(0,5).map(n=>n.target.join(' '))})))`, 40000);
      await rec('click', 'axe', 'axe-core violations (wcag2a, wcag2aa, wcag22aa)', ctx, v.length === 0, { violations: v.length, rules: v.map(x => `${x.id}(${x.impact},${x.nodes})`).join(' ') }, v.flatMap(x => x.targets.map(t => ({ sel: t, note: `${x.id}: ${x.help}` }))));
    });
  });
}

// ---------------------------------------------------------------- AREA: security
async function security() {
  log('== security');
  const host = new URL(BASE).host;
  const get = async (u, o = {}) => { const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...o }); return r; };
  const apex = host.replace(/^www\./, '');
  for (const u of [`http://${apex}/`, `http://www.${apex}/`, `https://www.${apex}/`]) await safe('redirect ' + u, async () => {
    let cur = u, hops = 0; const chain = [u];
    while (hops < 6) { const r = await get(cur); if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { cur = new URL(r.headers.get('location'), cur).href; chain.push(cur); hops++; } else { chain.push('=> ' + r.status); break; } }
    const final = chain.filter(c => !c.startsWith('=>')).pop();
    await rec('security', 'redirect-https', 'http/www variants reach https://' + apex + ' in <=1 hop', u, hops <= 1 && final.replace(/\/$/, '') === `https://${apex}`, { hops, chain: chain.join(' -> ') }, [], { shot: false });
  });
  const pagesFetched = {};
  const cookies = [];
  for (const p of PAGES) await safe('headers ' + p, async () => {
    const r = await get(url(p), { redirect: 'follow' });
    const body = await r.text(); pagesFetched[p] = body;
    const h = n => r.headers.get(n);
    const hsts = h('strict-transport-security'); const age = +((hsts || '').match(/max-age=(\d+)/i)?.[1] || 0);
    const csp = h('content-security-policy'), cspro = h('content-security-policy-report-only');
    (r.headers.getSetCookie?.() || []).forEach(c => cookies.push({ page: p, c }));
    const ctx = p + '.html';
    await rec('security', 'hsts', 'HSTS max-age >= 31536000', ctx, age >= 31536000, { header: hsts || null, maxAge: age }, [], { shot: false });
    await rec('security', 'nosniff', 'X-Content-Type-Options: nosniff', ctx, /nosniff/i.test(h('x-content-type-options') || ''), { header: h('x-content-type-options') }, [], { shot: false });
    await rec('security', 'referrer-policy', 'Referrer-Policy present', ctx, !!h('referrer-policy'), { header: h('referrer-policy') }, [], { shot: false });
    await rec('security', 'permissions-policy', 'Permissions-Policy present', ctx, !!h('permissions-policy'), { header: h('permissions-policy') }, [], { shot: false });
    await rec('security', 'frame-protection', 'X-Frame-Options or CSP frame-ancestors', ctx, !!h('x-frame-options') || /frame-ancestors/i.test((csp || '') + (cspro || '')), { xfo: h('x-frame-options'), csp: csp }, [], { shot: false });
    await rec('security', 'csp', 'CSP or CSP-Report-Only present (note: upgrade-insecure-requests alone is not a restricting policy)', ctx, !!(csp || cspro), { csp, reportOnly: cspro, restricting: !!((csp || cspro || '').match(/(default|script|style)-src/)) }, [], { shot: false });
  });
  // mixed content + SRI from raw HTML (+ local css/js)
  await safe('mixed/sri', async () => {
    const mixed = [], sri = [], origin = new URL(BASE).origin;
    const seenAssets = new Set();
    for (const [p, html] of Object.entries(pagesFetched)) {
      for (const m of html.matchAll(/(?:src|srcset|poster|data-src|href|action|content)=["']\s*(http:\/\/[^"'\s,]+)/gi)) {
        const before = html.slice(Math.max(0, m.index - 80), m.index + m[0].length);
        if (/<a\s[^>]*$/i.test(before.replace(/(?:src|srcset|poster|data-src|href|action|content)=["'][^"']*$/i, ''))) continue;
        if (/^http:\/\/www\.w3\.org/.test(m[1])) continue;
        mixed.push({ sel: `${p}.html`, note: m[1] });
      }
      for (const m of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
        const tag = m[0]; const isLink = m[1].toLowerCase() === 'link';
        const u = (tag.match(/\b(?:src|href)=["']([^"']+)["']/i) || [])[1]; if (!u) continue;
        if (isLink && !/rel=["'][^"']*stylesheet/i.test(tag)) continue;
        let abs; try { abs = new URL(u, url(p)); } catch { continue; }
        if (abs.origin === origin) { if (!isLink || true) seenAssets.add(abs.href); continue; }
        const hasI = /\bintegrity=/i.test(tag), hasC = /\bcrossorigin\b/i.test(tag);
        if (!hasI || !hasC) sri.push({ sel: `${p}.html <${m[1]}>`, note: `${abs.href} integrity=${hasI} crossorigin=${hasC}` });
      }
      for (const m of html.matchAll(/<script type="importmap">([\s\S]*?)<\/script>/gi)) for (const u of m[1].matchAll(/https?:\/\/[^"']+/g)) if (!u[0].startsWith(origin)) sri.push({ sel: `${p}.html importmap`, note: `${u[0]} (import maps: no integrity unless "integrity" key is used)` });
    }
    for (const a of seenAssets) { if (!/\.(css|js|mjs)(\?|$)/.test(a)) continue; try { const t = await (await fetch(a, { signal: AbortSignal.timeout(20000) })).text(); for (const m of t.matchAll(/(?:url\(\s*["']?|["'`])(http:\/\/(?!www\.w3\.org)[^"'`)\s]+)/g)) mixed.push({ sel: a.replace(origin, ''), note: m[1] }); } catch {} }
    const dedupe = a => [...new Map(a.map(x => [x.sel + x.note, x])).values()];
    await rec('security', 'mixed-content', '0 http:// subresources (HTML, local css/js)', 'all pages', mixed.length === 0, { found: dedupe(mixed).length }, dedupe(mixed), { shot: false });
    await rec('security', 'sri', 'Cross-origin scripts/stylesheets carry integrity + crossorigin', 'all pages', sri.length === 0, { missing: dedupe(sri).length }, dedupe(sri), { shot: false });
  });
  await safe('exposed', async () => {
    const o = BASE;
    const probe = async p => { try { const r = await fetch(o + p, { redirect: 'manual', signal: AbortSignal.timeout(20000) }); const b = await r.text(); return { status: r.status, len: b.length, body: b, ct: r.headers.get('content-type') || '', xp: r.headers.get('x-powered-by') }; } catch (e) { return { status: 'ERR', len: 0, body: '', ct: '', error: e.message }; } };
    const soft = await probe('/qa-nonexistent-' + Math.random().toString(36).slice(2) + '.txt');
    const home = await probe('/');
    const paths = ['/.git/HEAD', '/.env', '/.DS_Store', '/images/.DS_Store', '/README-DEPLOY.md', '/images/estonia/CREDITS.md', '/composer.json', '/package.json', '/phpinfo.php', '/info.php', '/backup.zip'];
    const bad = [], vals = [];
    for (const p of paths) {
      const r = await probe(p);
      const isSoft = r.status === 200 && (Math.abs(r.len - soft.len) <= Math.max(2, soft.len * 0.01) && soft.status === 200 || Math.abs(r.len - home.len) <= 2);
      vals.push(`${p}:${r.status}${isSoft ? '(soft-404)' : ''}`);
      if (r.status === 200 && !isSoft) bad.push({ sel: p, note: `200, ${r.len} bytes, ${r.ct}, starts: ${JSON.stringify(r.body.slice(0, 60))}` });
    }
    await rec('security', 'exposed-paths', 'Sensitive paths are not 200 (soft-404 length compared)', 'paths', bad.length === 0, { soft404: `${soft.status}/${soft.len}b`, results: vals.join(' ') }, bad, { shot: false });
    const idx = [];
    for (const d of ['/images/', '/css/']) { const r = await probe(d); if (/Index of/i.test(r.body)) idx.push({ sel: d, note: 'directory listing' }); vals.push(d + ':' + r.status); }
    await rec('security', 'dir-listing', '/images/ and /css/ show no "Index of"', 'paths', idx.length === 0, { checked: '/images/ /css/' }, idx, { shot: false });
    const s = await probe('/send.php');
    const leak = /(Warning|Notice|Fatal error|Parse error|Deprecated):|Stack trace|on line \d+|\.php:\d+/i.test(s.body);
    await rec('security', 'sendphp', 'GET /send.php: no PHP warnings/stack traces, no X-Powered-By', 'send.php', !leak && !s.xp, { status: s.status, xPoweredBy: s.xp, bodyLen: s.len, body: s.body.slice(0, 80) }, leak ? [{ sel: '/send.php', note: s.body.slice(0, 160) }] : [], { shot: false });
  });
  await safe('cookies', async () => {
    let all = cookies.map(x => ({ src: 'Set-Cookie ' + x.page, c: x.c }));
    if (browserUp) { try { const r = await send('Network.getAllCookies'); all = all.concat(r.cookies.map(c => ({ src: 'browser', c: `${c.name}=; ${c.secure ? 'Secure; ' : ''}${c.httpOnly ? 'HttpOnly; ' : ''}${c.sameSite ? 'SameSite=' + c.sameSite : ''}` }))); } catch {} }
    const bad = all.filter(x => !(/;\s*Secure/i.test(x.c) && /;\s*HttpOnly/i.test(x.c) && /;\s*SameSite=/i.test(x.c)));
    await rec('security', 'cookies', 'No Set-Cookie without Secure/HttpOnly/SameSite', 'all', bad.length === 0, { cookiesSeen: all.length }, bad.map(x => ({ sel: x.src, note: x.c.slice(0, 120) })), { shot: false });
  });
}

// ---------------------------------------------------------------- run
const timers = {};
async function main() {
  log(`qa-check ${BASE} -> ${OUT}  areas=${AREAS} pages=${PAGES} port=${PORT}`);
  if (needBrowser) await startChrome();
  for (const [a, fn] of [['animation', animation], ['scroll', scrollArea], ['click', clickArea]]) {
    if (!AREAS.includes(a)) continue;
    const t = Date.now(); await safe(a, fn); timers[a] = Math.round((Date.now() - t) / 1000); log(`   ${a} done in ${timers[a]}s`);
  }
  ctxState.label = 'security';
  if (AREAS.includes('security')) { const t = Date.now(); await safe('security', security); timers.security = Math.round((Date.now() - t) / 1000); }
  // console + network over the whole run
  if (needBrowser) {
    const real = consoleLog.filter(c => !c.expect && !/send\.php/.test(c.text)), dd = [...new Map(real.map(c => [c.level + c.text, c])).values()];
    await rec('click', 'console', 'Console errors/warnings during the whole run (excluding deliberate no-JS/CDN-blocked phases)', 'whole run', dd.length === 0, { errorsOrWarnings: dd.length, occurrences: real.length }, dd.map(c => ({ sel: c.page, note: `${c.level}: ${c.text}` })), { shot: false });
    const nf = netFail.filter(c => !c.expect), nd = [...new Map(nf.map(c => [c.url + c.error, c])).values()];
    await rec('click', 'failed-requests', 'Failed requests (>=400 / network error) during the whole run (excluding deliberate phases)', 'whole run', nd.length === 0, { failed: nd.length }, nd.map(c => ({ sel: c.page, note: `${c.error} ${c.url}` })), { shot: false });
  }
  cleanup();
  const runtime = Math.round((Date.now() - T0) / 1000);
  const checks = [...CHECKS.values()].map(c => ({ ...c, pass: c.runs.every(r => r.pass), failedRuns: c.runs.filter(r => !r.pass).length, totalRuns: c.runs.length }));
  const summary = {};
  for (const c of checks) { const s = (summary[c.area] ||= { checks: 0, failedChecks: 0, failedRuns: 0, totalRuns: 0 }); s.checks++; s.failedChecks += c.pass ? 0 : 1; s.failedRuns += c.failedRuns; s.totalRuns += c.totalRuns; }
  const report = { base: BASE, date: new Date().toISOString(), runtimeSeconds: runtime, areaSeconds: timers, areas: AREAS, pages: PAGES, summary, checks };
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  const L = [`# QA report`, ``, `Base: ${BASE}  |  ${report.date}  |  runtime ${runtime}s  |  pages: ${PAGES.join(', ')}`, ``, `| Area | Checks failing | Failing runs / total |`, `|---|---|---|`];
  for (const [a, s] of Object.entries(summary)) L.push(`| ${a} | ${s.failedChecks} / ${s.checks} | ${s.failedRuns} / ${s.totalRuns} |`);
  for (const area of [...new Set(checks.map(c => c.area))]) {
    L.push('', `## ${area}`);
    for (const c of checks.filter(c => c.area === area)) {
      L.push('', `### ${c.pass ? 'PASS' : 'FAIL'}  ${c.id}  (${c.failedRuns}/${c.totalRuns} runs failed)`, c.title);
      const show = c.pass ? c.runs.slice(0, 2) : c.runs.filter(r => !r.pass);
      for (const r of show) {
        L.push(`- ${r.pass ? 'ok' : 'FAIL'} [${r.ctx}] ${JSON.stringify(r.measured)}`);
        for (const o of r.offenders.slice(0, 8)) L.push(`    - ${typeof o === 'string' ? o : o.sel + (o.note ? '  ' + o.note : '')}`);
        if (r.offenders.length > 8) L.push(`    - ... +${r.offenders.length - 8} more (see report.json)`);
        if (r.shot) L.push(`    - screenshot: ${r.shot}`);
      }
      if (c.pass && c.runs.length > 2) L.push(`- ... ${c.runs.length - 2} more passing runs`);
    }
  }
  writeFileSync(path.join(OUT, 'report.md'), L.join('\n') + '\n');
  log(`done in ${runtime}s -> ${OUT}`);
  console.log(JSON.stringify({ runtimeSeconds: runtime, summary }, null, 1));
  process.exit(0);
}
main().catch(e => { console.error(e); cleanup(); process.exit(1); });
