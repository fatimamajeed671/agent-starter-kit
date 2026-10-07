<!-- Source: nextlevelbuilder/ui-ux-pro-max-skill @ 477bcb28c9812b385cb51a4605ddf30d7b2266e2 | Licence: MIT (see SOURCES.md) | Converted from CSV, trimmed -->
# Native-interface and CSS-utility rules (AI-n, TW-n)

Converted from `app-interface.csv` (AI) and `stacks/html-tailwind.csv` (TW, general rows only; Tailwind class names are examples, the principle applies to plain CSS). AI rows target native apps: use them as principles, apply web thresholds from `wcag-essentials.md`. Sev: C=Critical, H=High, M=Medium, L=Low. Source text paraphrase-free (MIT), trimmed to marketing-site rows.

## App-interface principles

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| AI-6 | Touch Target Size | Select 44pt for iOS and 48dp for Android at runtime; evaluate web targets separately against WCAG 2.5.8 and its exceptions | Collapse iOS 44pt, Android 48dp, and web 24 CSS px into one cross-platform number | C |
| AI-7 | Touch Spacing | Keep at least 8dp spacing between touchables | Cluster many buttons with no gap | M |
| AI-15 | Error Feedback | input-level error + summary banner | Only change border color with no explanation | H |
| AI-16 | Inline Validation | Validate onBlur and onSubmit | Validate on every keystroke causing jank | M |
| AI-26 | Base Font Size | Use platform fontScale and at least 14–16pt base | Render critical text below 12pt | H |
| AI-27 | Dynamic Type Support | Set allowFontScaling and test large text | Disable scaling on all text globally | H |
| AI-30 | No Gesture-Only Actions | Provide visible buttons in addition to gestures | Rely on swipe/shake only with no UI affordance | C |
| AI-31 | Dragging Alternatives | Provide named Move up/down buttons or a position menu beside drag handles; route iOS and Android behavior through the runtime platform adapter | Make drag, swipe, or a web-only pointer handler the only way to reorder native content | H |
| AI-32 | Authentication Reuse | Support password managers passkeys paste and prefilled confirmed values | Force users to retype credentials or the same data in one flow | C |

## HTML/CSS utility rules

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| TW-8 | Container max-width | max-w-7xl mx-auto for main content | Full-width content on large screens | M |
| TW-9 | Responsive padding | px-4 md:px-6 lg:px-8 | Same padding all sizes | M |
| TW-12 | Aspect ratio | aspect-video aspect-square | No aspect ratio on containers | M |
| TW-13 | Object fit | object-cover object-contain | Stretched distorted images | M |
| TW-14 | Reserve image space | aspect-video or explicit dimensions | Let images determine layout after load | H |
| TW-15 | Responsive image layout | w-full md:w-1/2 | Use a fixed desktop width at every viewport | H |
| TW-34 | Touch targets | min-h-11 min-w-11 on mobile | Small buttons on mobile | H |
| TW-35 | Loading states | Disable the action and expose busy state | Leave button clickable during loading | H |
| TW-36 | Icon buttons | aria-label on icon buttons | Icon button without label | H |
| TW-38 | Card hover states | hover:shadow-lg transition-shadow | No hover on clickable cards | M |
| TW-57 | Balanced heading wrapping | Use text-balance with a readable max-width and natural wrapping fallback | Insert hardcoded br tags or blanket nonbreaking spaces | M |
| TW-58 | Long token resilience | Use wrap-anywhere on unpredictable text and min-w-0 on its flexible parent | Use break-all globally or keep the flex child at its intrinsic minimum | H |
| TW-59 | Compact label layout | Use flex flex-wrap gap-2 for collections; for one label use whitespace-nowrap bounded min-w-0 truncate and shrink-0 controls | Clip a fixed-height row let labels wrap inside a pill or let dismiss icons shrink | H |
| TW-19 | Text truncation | truncate or line-clamp-* | Overflow breaking layout | M |
