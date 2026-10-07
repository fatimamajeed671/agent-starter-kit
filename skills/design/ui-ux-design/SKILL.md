---
name: ui-ux-design
description: UI/UX design rules and critique guides for web pages. Use for UI/UX design decisions, mobile layout, buttons and CTAs, forms and validation, FAQ accordions, cards, layout, spacing and polish, accessibility checks and design critique of landing and marketing pages.
---

# UI/UX design

Read only the file the question needs. Licences and upstreams: SOURCES.md.

## Index
| Topic | File |
|---|---|
| Layout, touch, buttons, forms, typography, a11y, motion (Do / Don't table) | rules/ux-guidelines.md |
| Section order and CTA placement for landing pages | rules/landing-patterns.md |
| Measurable thresholds (contrast, target size, focus, reflow, errors) | rules/wcag-essentials.md |
| Why: buttons vs links, CTA labels, cards, FAQ, forms, proof, rhythm | rules/research-summaries.md |
| Native-app principles, CSS utility rules (secondary) | rules/native-and-css-rules.md |
| Impeccable workflow overview and design laws | impeccable/GUIDE.md |
| Impeccable topic guides (critique, audit, polish, layout, forms, motion, color, typography, adapt, harden) | impeccable/reference/*.md |

## Process
1. Name the page section being judged (hero, services, cards, testimonials, offer, FAQ, contact form).
2. Pick the matching rules from the index.
3. Check thresholds in wcag-essentials.md before proposing sizes or colours.
4. State each recommendation with its citation, then the concrete change.
5. When rules conflict: WCAG thresholds, then research summaries, then pro-max Do/Don't, then impeccable guidance.

## Citing a rule
Write path plus rule ID:
- `rules/ux-guidelines.md UX-54`
- `rules/landing-patterns.md LP-hero-testimonials-cta`
- `rules/wcag-essentials.md W-2.5.8`
- `rules/research-summaries.md R-FORM-3`
- impeccable has no rule IDs: cite `impeccable/reference/<file>.md` and the section heading.

IDs: UX-n and AI-n/TW-n are source row numbers; LP- is the pattern id; W- is the WCAG criterion; R- is topic plus number.

## Impeccable limits
GUIDE.md commands, scripts and live mode are not installed. Use impeccable/reference/*.md as reading only; do not try to run its commands.

## Other limits
- Research summaries are paraphrases; quote none verbatim.
- Rules marked (excerpt) rest on a search excerpt; say so when citing.
- No thumb-zone or before/after-slider rule is verified; do not cite one.
