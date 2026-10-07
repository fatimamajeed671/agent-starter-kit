---
name: web-app-standards
description: Use when testing, hardening or deploying a static site or web app front end. Covers security headers and form hardening, a QA checklist (animation, scroll, click, accessibility), deploy-by-hash verification, cache busting and browser testing gotchas. Includes two CDP audit scripts.
---

# Web app standards

Generic checklist for shipping a front end safely. For visual and UX rules use the `ui-ux-design` skill (landing patterns, WCAG essentials).

## Security (check with curl, no login)

- One-hop 301 from http and www to the canonical https host.
- HSTS with max-age of at least one year.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, frame protection (`X-Frame-Options` or CSP `frame-ancestors`).
- CSP: ship `Content-Security-Policy-Report-Only` first, built from the hosts the page really uses; enforce after a clean run.
- CDN scripts and styles carry SRI (`integrity` + `crossorigin`). Font CSS is usually exempt.
- No mixed content. No dotfiles, backups (`*.bak`, `*.sql`, `*.md`), `.DS_Store` or directory listings served.
- Cookies, if any: Secure, HttpOnly, SameSite.
- Server config file (`.htaccess` or equivalent): copy the current one to a backup before any change, wrap rules in `<IfModule>`, curl every page plus css/js after upload, and on any 5xx put the backup back at once. Keep a URL test script for redirects and headers.

## Forms

- Length caps on every field; strip newlines from anything that goes into a mail header.
- Hidden timestamp trap (reject under 3 seconds or over a day).
- Per-IP rate limit (for example 5 per 10 minutes), IP stored hashed.
- Disable the submit button while sending; at most one POST per burst of rapid clicks, including after a failed POST.
- Real-mail tests only with a clear "[QA TEST]" subject, few, and after telling the owner.

## QA checklist

- Animation: test with reduced motion both on and off, at phone (touch) and desktop (mouse) widths. Every reveal ends at opacity 1 within 2s of entering view. CLS at most 0.1. At most one long frame over 200 ms, p95 rAF at most 20 ms. Reduced motion means no moving animation. No-JS and CDN-blocked render all text. Loops are idle offscreen; loops over 5s have a pause control. Never animate one element from two tweens.
- Scroll: every #anchor lands just below the fixed nav (click and cold load); back restores scroll position; no horizontal overflow from 320 to 1440; scroll-trigger positions stable after fonts, images and resize. Section gaps at most 160px desktop, 110px mobile.
- Click: hit-test every control with `elementFromPoint` at phone and desktop widths. Targets at least 24px (WCAG 2.5.8), flag under 44. Tab order, visible focus, no trap, Esc closes menus and returns focus. Links return 200 and their ids exist. `_blank` links have `noopener`. Form labels, autocomplete, announced errors. axe-core wcag22aa clean. Console clean.
- Visual: review 100% crops at phone and desktop widths, not scaled sheets. Heading line counts at 360/390/1373 with no lone last word. JSON-LD parses.

## Deploy hygiene

- Prepare final files and a `final.sha256` with plain relative paths. After upload, curl each file with a random `?cb=` and compare sha256.
- Cache-bust: give every changed CSS/JS a new `?v=` (Unix timestamp) on every page that links it, and verify that exact versioned URL. Never request a versioned URL before its file is live, or an edge caches the old file under it. A CDN flush does not reliably clear edge copies.
- Keep a rollback copy of every file you replace. Images re-encoded by an upload tool differ in bytes; verify them by HTTP 200 and dimensions.
- Server-executed files (for example PHP) cannot be hashed over HTTP; check size, time and a GET status.

## Testing gotchas

- Background browser tabs pause rAF: animations freeze at their start state. Bring the tab to the front.
- Headless Chrome inherits the OS reduce-motion setting; force `no-preference` when testing motion.
- iOS Safari often skips `pointerleave` after a touch-scroll: hover effects on `pointermove` must ignore non-mouse pointers and be neutralised under `@media (hover: none)`. Desktop Chrome cannot reproduce the stuck state; test by forcing the values.
- Scroll parallax pushes elements into neighbouring gaps; gaps must exceed the lift.
- `CSS.forcePseudoState` hangs in headless Chrome. Do not use it.
- The `--screenshot` CLI may write nothing; use CDP `Page.captureScreenshot`.
- Browser extensions cannot open `file://`; serve with `python3 -m http.server --bind 127.0.0.1 <port>`.
- Extension output filters can block results with emails or query strings; return hashes or booleans.
- Parallel agents need random HTTP and CDP ports; kill strays (`pgrep -fl remote-debugging-port`). Never run two audit processes on one fixed port.
- Headless SwiftShader "GPU stall" warnings are noise.
- PageSpeed API without a key hits a shared daily quota; use the host's panel or a keyed call.

## Scripts (Node 22, no dependencies, local headless Chrome over CDP)

```sh
node scripts/qa-check.mjs <url> <outDir>          # AREAS=animation,scroll,click,security  PAGES=...
node scripts/mobile-audit.mjs <url> <outDir>      # PAGES=a,b WIDTHS=390 MODE=dynamic
```

- Both launch a fresh temp profile per run and intercept form POSTs (qa-check never sends mail).
- `mobile-audit` static mode flags overflow, gutter misalignment, centering, overlaps and tap targets under 40px at 360/390/430/768/1373. Dynamic mode replays touch swipes and taps, samples gaps every 100px while scrolling, and flags stuck transforms. Run both for layout work.
- Treat script findings as leads: view the screenshots before calling something a bug.
- Pages are addressed as `<base>/<name>.html`; pass the names with `PAGES=index,about`. The form checks look for a form posting to `send.php` and a contact page; adapt those selectors when your site differs. Chrome path: `CHROME=...` (default is the macOS app).
