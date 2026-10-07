<!-- Source: nextlevelbuilder/ui-ux-pro-max-skill @ 477bcb28c9812b385cb51a4605ddf30d7b2266e2 | Licence: MIT (see SOURCES.md) | Converted from CSV, trimmed -->
# Landing page patterns (LP-<pattern-id>)

Converted from `landing.csv`. Only patterns usable by a service-agency page are kept; product, app-store, event, marketplace, 3D, AI and waitlist patterns dropped. Cite as `landing-patterns.md LP-hero-testimonials-cta`.

## LP-hero-features-cta
- Section order: Hero with headline/image > Value prop > Key features (3-5) > CTA section > Footer
- CTA placement: Hero (sticky) + Bottom
- Rules: Deep CTA placement. For CTA label text, verify at least 4.5:1 against the button fill; use 7:1 only when the product explicitly targets AAA normal-text contrast. Keep focus and component boundaries independently visible. Disable hero parallax under reduced motion and render its static final state.

## LP-hero-testimonials-cta
- Section order: Hero > Problem statement > Solution overview > Testimonials carousel > CTA
- CTA placement: Hero (sticky) + Post-testimonials
- Rules: Social proof before CTA. Use a concise set of verified testimonials with photo, name, and role. CTA after social proof. Provide previous/next and pause controls; stop rotation on focus, hover, and reduced motion; announce slide position. Previous/next buttons and keyboard controls must expose every slide without dragging.

## LP-product-demo-features
- Section order: Hero > Product video/mockup (center) > Feature breakdown per section > Comparison (optional) > CTA
- CTA placement: Video center + CTA right/bottom
- Rules: Use an interactive demo only when it explains value better than static media. Provide captions, transcript, visible play/pause controls, and a non-video fallback; do not autoplay under reduced motion. Pause media when offscreen or hidden and keep the final product state available as static content.

## LP-minimal-single-column
- Section order: Hero headline > Short description > Benefit bullets (3 max) > CTA > Footer
- CTA placement: Center, large CTA button
- Rules: Single CTA focus. Large typography. Lots of whitespace. No nav clutter. Mobile-first.

## LP-funnel-3-step-conversion
- Section order: Hero > Step 1 (problem) > Step 2 (solution) > Step 3 (action) > CTA progression
- CTA placement: Each step: mini-CTA. Final: main CTA
- Rules: Progressive disclosure. Show only essential info per step. Use progress indicators. Multiple CTAs.

## LP-lead-magnet-form
- Section order: Hero (benefit headline) > Lead magnet preview (ebook cover, checklist, etc) > Form (minimal fields) > CTA submit
- CTA placement: Form CTA: Submit button
- Rules: Ask only for information necessary to deliver the lead magnet. Preview its value and show submission progress.

## LP-video-first-hero
- Section order: Hero with video background > Key features overlay > Benefits section > CTA
- CTA placement: Overlay on video (center/bottom) + Bottom section
- Rules: Use video only when it demonstrates value better than static media. Add captions for accessibility. Compress video for performance. Provide captions and a visible pause control; use a static poster when reduced motion is requested. Pause video when offscreen or hidden; the reduced-motion poster must preserve the final message and CTA.

## LP-faq-documentation-landing
- Section order: Hero with search bar > Popular categories > FAQ accordion > Contact/support CTA
- CTA placement: Search bar prominent + Contact CTA for unresolved questions
- Rules: Reduce support tickets. Track search analytics. Show related articles. Contact escalation path.

## LP-before-after-transformation
- Section order: Hero (problem state) > Transformation slider/comparison > How it works > Results CTA
- CTA placement: After transformation reveal + Bottom
- Rules: Visual proof of value. Measure the outcome with product-specific analytics. Real results. Specific metrics. Guarantee offer. Provide arrow buttons and keyboard steps so dragging is not required. Arrow buttons and keyboard steps expose the same final before/after positions; reduced motion removes reveal animation.

## LP-portfolio-grid
- Section order: Hero (Name/Role) > Project Grid (Masonry) > About/Philosophy > Contact
- CTA placement: Project Card Hover + Footer Contact
- Rules: Visuals first. Filter by category. Fast loading essential.

## LP-bento-grid-showcase
- Section order: Hero > Bento Grid (Key Features) > Detail Cards > Tech Specs > CTA
- CTA placement: Floating Action Button or Bottom of Grid
- Rules: Scannable value props. High information density without clutter. Mobile stack. Keep cards usable without hover and suppress tilt/stagger/video motion under reduced motion. Pause card media offscreen/hidden and render cards in their final readable state under reduced motion.

## LP-feature-rich-showcase
- Section order: Hero (value prop) > Feature grid/cards (4-6) > Use cases or benefits > Social proof or logos > CTA
- CTA placement: Hero (sticky) + After features + Bottom
- Rules: Clear feature hierarchy. One key message per card. Strong CTA repetition.

## LP-hero-centric-design
- Section order: Full-bleed Hero (headline + visual) > Single value prop strip > Key benefit or proof > Primary CTA
- CTA placement: Hero dominant (center/bottom) + Sticky nav CTA
- Rules: One primary CTA. Let the hero dominate the initial viewport without hiding the next content cue. Use a static hero and non-pulsing CTA when reduced motion is requested; provide video controls. Pause hero media offscreen/hidden and keep the final hero message and CTA static under reduced motion.

## LP-trust-authority-conversion
- Section order: Hero (mission/credibility) > Proof (logos, certs, stats) > Solution overview > Clear CTA path
- CTA placement: Contact Sales / Get Quote (primary) + Nav
- Rules: Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.

## Cross-pattern takeaways (derived from the rows above)
- One primary CTA per section; repeat the same action label after proof sections (LP-hero-testimonials-cta, LP-feature-rich-showcase).
- Place social proof before the closing CTA (LP-hero-testimonials-cta, LP-trust-authority-conversion).
- Keep every section usable without hover, parallax or motion (LP-bento-grid-showcase, LP-scroll-triggered-storytelling).
- Contact path must be reachable for unresolved questions (LP-faq-documentation-landing).
