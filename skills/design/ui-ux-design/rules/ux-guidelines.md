<!-- Source: nextlevelbuilder/ui-ux-pro-max-skill @ 477bcb28c9812b385cb51a4605ddf30d7b2266e2 | Licence: MIT (see SOURCES.md) | Converted from CSV, trimmed -->
# UX guidelines (UX-n)

Converted from `ux-guidelines.csv`. ID = UX-<row No>. Sev: C=Critical, H=High, M=Medium, L=Low. Source text paraphrase-free (MIT), trimmed to marketing-site rows.
Cite as `ux-guidelines.md UX-54`.

## Layout and responsive (mobile-first)

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-64 | Mobile First | Start with mobile styles then add breakpoints | Desktop-first causing mobile issues | M |
| UX-65 | Breakpoint Testing | Test at 320 375 414 768 1024 1440 | Only test on your device | M |
| UX-66 | Touch Friendly | Increase touch targets on mobile | Same tiny buttons on mobile | H |
| UX-67 | Readable Font Size | Minimum 16px body text on mobile | Tiny text on mobile | H |
| UX-68 | Viewport Meta | Use width=device-width initial-scale=1 | Missing or incorrect viewport | H |
| UX-69 | Horizontal Scroll | Ensure content fits viewport width | Content wider than viewport | H |
| UX-70 | Image Scaling | Use max-width: 100% on images | Fixed width images overflow | M |
| UX-20 | Viewport Units | Use dvh or account for mobile browser chrome | Use 100vh for full-screen mobile layouts | M |
| UX-21 | Container Width | Limit max-width for text content (65-75ch) | Let text span full viewport width | M |
| UX-19 | Content Jumping | Reserve appropriate space or keep async states in a stable content-driven container | Insert compact text or media without a layout strategy | H |
| UX-111 | Long Token Wrapping | Use overflow-wrap anywhere and let flex or grid text children shrink | Apply word-break break-all to all prose | H |
| UX-112 | Text Reflow and Spacing | Use fluid sizes content-driven height and unitless line height | Clip text in fixed-width or fixed-height boxes | C |
| UX-17 | Fixed Positioning | Account for safe areas and other fixed elements | Stack multiple fixed elements carelessly | M |

## Navigation and anchors

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-1 | Smooth Scroll | Use scroll-behavior: smooth on html element | Jump directly without transition | H |
| UX-2 | Sticky Navigation | Add padding-top to body equal to nav height | Let nav overlap first section content | M |
| UX-3 | Active State | Highlight active nav item with color/underline | No visual feedback on current location | M |
| UX-45 | Skip Links | Provide skip to main content link | No skip link on nav-heavy pages | M |

## Touch, targets and gestures

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-22 | Touch Target Size | Use 44pt on iOS and 48dp on Android; for web use the separate WCAG Target Size rule | Treat one unit or minimum as universal across platforms | H |
| UX-23 | Touch Spacing | Minimum 8px gap between touch targets | Tightly packed clickable elements | M |
| UX-24 | Gesture Conflicts | Avoid horizontal swipe on main content | Override system gestures | M |
| UX-11 | Hover vs Tap | Use click/tap for primary interactions | Rely only on hover for important actions | H |
| UX-103 | Dragging Movements | Add buttons menus or tap-to-move controls and retain keyboard operation | Make dragging the only way to reorder resize or select | H |
| UX-104 | Target Size (Minimum) | Use at least 24 by 24 CSS px or verify spacing equivalent inline user-agent or essential exceptions | Assume native 44pt or 48dp guidance defines web conformance | H |

## Buttons, links, interaction states

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-28 | Focus States | Use a visible focus ring on every interactive control, including modal controls | Remove focus outline without replacement | H |
| UX-29 | Hover States | Change cursor and add subtle visual change | No hover feedback on clickable elements | M |
| UX-30 | Active States | Add pressed/active state visual change | No feedback during interaction | M |
| UX-31 | Disabled States | Reduce opacity and change cursor | Confuse disabled with normal state | M |
| UX-32 | Loading Buttons | Disable button and show loading state | Allow multiple clicks during processing | H |
| UX-33 | Error Feedback | Show clear error messages near problem | Silent failures with no feedback | H |
| UX-34 | Success Feedback | Show success message or visual change | No confirmation of completed action | M |
| UX-117 | Compact Control Semantics | Prefer a button and expose pressed or selected state that matches the visible label | Use a clickable div or reveal the only action on hover | C |
| UX-40 | ARIA Labels | Add aria-label for icon-only buttons | Icon buttons without labels | H |

## Forms

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-54 | Input Labels | Always show label above or beside input | Placeholder as only label | H |
| UX-55 | Error Placement | Show a specific error below the input and reference it with aria-describedby | Show only a top-level error without identifying each invalid field | H |
| UX-56 | Inline Validation | Validate on blur for most fields | Validate only on submit | M |
| UX-57 | Input Types | Use email tel number url etc | Text input for everything | M |
| UX-58 | Autofill Support | Use autocomplete attribute properly | Block or ignore autofill | M |
| UX-59 | Required Indicators | Use asterisk or (required) text | No indication of required fields | M |
| UX-61 | Submit Feedback | Show loading then success/error state | No feedback after submit | H |
| UX-62 | Input Affordance | Use distinct input styling | Inputs that look like plain text | M |
| UX-63 | Mobile Keyboards | Use inputmode attribute | Default keyboard for all inputs | M |
| UX-106 | Redundant Entry | Auto-populate prior values or let users select previously entered information | Ask users to retype the same address or account data without necessity | M |
| UX-107 | Accessible Authentication (Minimum) | Allow password managers and paste; offer passkeys OAuth or another non-cognitive method | Block paste or require manual OTP transcription with no alternative | C |
| UX-109 | Focusable Error Summary | Place it at the top of the form; move focus to its heading or container after failed submit; link each item to its invalid field; retain inline errors | Replace inline errors with a visual-only summary or move focus on every blur | H |
| UX-43 | Form Labels | Use label with for attribute or wrap input | Placeholder-only inputs | H |
| UX-44 | Error Messages | Use aria-live or role=alert for errors | Visual-only error indication | H |

## Typography and readability

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-72 | Line Height | Use 1.5-1.75 for body text | Cramped or excessive line height | M |
| UX-73 | Line Length | Limit to 65-75 characters per line | Full-width text on large screens | M |
| UX-74 | Font Size Scale | Use consistent modular scale | Random font sizes | M |
| UX-75 | Font Loading | Reserve space with fallback font | Layout shift when fonts load | M |
| UX-76 | Contrast Readability | Use darker text on light backgrounds | Gray text on gray background | H |
| UX-77 | Heading Clarity | Clear size/weight difference | Headings similar to body text | M |
| UX-110 | Heading Line Balance | Bound the measure and test natural-wrap fallback across widths fonts and locales | Promise an exact final line or insert blanket nonbreaking spaces or hardcoded br tags | M |
| UX-50 | Font Loading | Use font-display swap or optional | Invisible text during font load | M |

## Accessibility: contrast, focus, structure

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-36 | Color Contrast | Minimum 4.5:1 ratio for normal text | Low contrast text | H |
| UX-37 | Color Only | Use icons/text in addition to color | Red/green only for error/success | H |
| UX-38 | Alt Text | Descriptive alt text for meaningful images | Empty or missing alt attributes | H |
| UX-39 | Heading Hierarchy | Use sequential heading levels h1-h6 | Skip heading levels or misuse for styling | M |
| UX-41 | Keyboard Navigation | Keep tab order aligned with visual order and test every action without a pointer | Keyboard traps or illogical tab order | H |
| UX-42 | Screen Reader | Use semantic HTML and ARIA properly | Div soup with no semantics | M |
| UX-99 | Motion Sensitivity | Honor prefers-reduced-motion and present the final readable state without parallax or scroll-jacking | Force scroll effects | H |
| UX-100 | Focus Not Obscured (Minimum) | Offset sticky UI with scroll-padding and dismiss or move persistent overlays | Let headers footers banners or chat widgets fully cover focus | H |
| UX-101 | Focus Not Obscured (Enhanced) | Keep the entire focused component unobscured by author-created content | Present this enhanced AAA criterion as an AA requirement or allow persistent UI to hide any part of focus | M |
| UX-102 | Focus Appearance | Use an indicator at least as large as a 2 CSS px perimeter with 3:1 state contrast | Present this enhanced AAA criterion as an AA requirement or use a thin low-contrast outline | M |
| UX-105 | Consistent Help | Keep contact self-help and automated help in consistent locations | Move help controls to different locations on each page | M |

## Content, cards, compact labels

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-84 | Truncation | Truncate with ellipsis and expand option | Overflow or broken layout | M |
| UX-87 | Placeholder Content | Use realistic sample data | Lorem ipsum everywhere | L |
| UX-113 | Essential Text Truncation | Wrap stack resize or provide a visible full-detail path | Clamp essential meaning only to make cards uniform | C |
| UX-114 | Compact Label Semantics | Choose static or interactive markup from the label's meaning and ownership | Make every pill clickable or encode status with color alone | H |
| UX-115 | Chip Collection Reflow | Wrap the collection or use an operable +n disclosure for hidden overflow values | Force all chips into one clipped row or hide overflow values | H |
| UX-116 | Compact Label Overflow | Bound only unpredictable values; use nowrap with a shrinkable label; expose full text to keyboard pointer and touch users | Let one compact label wrap to a second line or use a hover-only tooltip | H |
| UX-78 | Loading Indicators | Follow platform and component guidance; preserve layout focus and accessible busy status | Apply one timing threshold to every operation or leave long waits unexplained | H |
| UX-80 | Error Recovery | Provide clear next steps | Error without recovery path | M |

## Motion, media, carousels

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-7 | Excessive Motion | Animate 1-2 key elements per view maximum | Animate everything that moves | H |
| UX-9 | Reduced Motion | Check prefers-reduced-motion media query | Ignore accessibility motion settings | H |
| UX-10 | Loading States | Use skeleton screens or spinners | Leave UI frozen with no feedback | H |
| UX-13 | Transform Performance | Use transform and opacity for animations | Animate width/height/top/left properties | M |
| UX-96 | Auto-Play Video | Prefer click-to-play; provide pause and captions; stop off-screen and honor reduced motion | Auto-play high-resolution loops without pause or captions | M |
| UX-108 | Auto-Rotating Content Controls | Provide previous next and play/pause; stop on focus or hover and when reduced motion is requested | Auto-advance slides without a stop control | H |

## Performance that affects design

| ID | Rule | Do | Don't | Sev |
|---|---|---|---|---|
| UX-46 | Image Optimization | Use appropriate size and format (WebP) | Unoptimized full-size images | H |
| UX-47 | Lazy Loading | Lazy load below-fold images and content | Load everything upfront | M |
| UX-51 | Third Party Scripts | Load non-critical scripts async/defer | Synchronous third-party scripts | M |
