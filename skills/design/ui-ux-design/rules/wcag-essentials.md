<!-- Source: W3C, Web Content Accessibility Guidelines (WCAG) 2.2, https://www.w3.org/TR/WCAG22/ | Licence: W3C Document License (https://www.w3.org/copyright/document-license/), attribution given | Fetched 2026-10-06; condensed and paraphrased -->
# WCAG 2.2 essentials (W-<SC number>)

Condensed from W3C WCAG 2.2. Cite as `wcag-essentials.md W-2.5.8`. Normative wording lives at the source URL; the lines below are summaries. Use AA as the floor; AAA rows are stretch goals and must not be called "required".

## Target size and pointer
| ID | Level | Rule | Measurable threshold |
|---|---|---|---|
| W-2.5.8 Target Size (Minimum) | AA | Pointer targets are big enough, or spaced so a 24px circle on each target does not overlap another target. Exceptions: inline text links, browser-controlled controls, essential layouts. | >= 24x24 CSS px (or equivalent spacing) |
| W-2.5.5 Target Size (Enhanced) | AAA | Larger targets for primary controls; inline links exempt. | >= 44x44 CSS px |
| W-2.5.7 Dragging Movements | AA | Anything done by dragging (sliders, before/after handles, reorder) also works with single taps or clicks. | Provide a non-drag alternative |

Project default: buttons, nav links, accordion headers and form controls at least 44px tall on mobile; keep 8px between adjacent targets (pro-max UX-23).

## Focus
| ID | Level | Rule | Threshold |
|---|---|---|---|
| W-2.4.7 Focus Visible | AA | Every keyboard-operable control shows a visible focus indicator. | Visible on every control; no `outline: none` without a replacement |
| W-2.4.11 Focus Not Obscured (Minimum) | AA | A focused control is not completely hidden by sticky headers, cookie banners or chat widgets. | At least part visible; set `scroll-padding-top` to the sticky header height |
| W-2.4.12 Focus Not Obscured (Enhanced) | AAA | No part of the focused control is hidden. | 100% visible |
| W-2.4.13 Focus Appearance | AAA | Focus indicator is large and contrasting enough to see. | Area >= a 2 CSS px thick perimeter of the control; 3:1 contrast between focused and unfocused states |

## Contrast, reflow, spacing
| ID | Level | Rule | Threshold |
|---|---|---|---|
| W-1.4.3 Contrast (Minimum) | AA | Text and images of text contrast with their background. Logos and disabled controls are exempt. | Normal text 4.5:1; large text (about 24px, or 18.66px bold) 3:1 |
| W-1.4.11 Non-text Contrast | AA | Control boundaries needed to find a control, its states, and meaningful graphics contrast with neighbours. | 3:1 against adjacent colours |
| W-1.4.10 Reflow | AA | Content works in one column, no two-dimensional scrolling, at 400% zoom. | Layout holds at 320 CSS px wide (256px high for horizontally scrolling content) |
| W-1.4.12 Text Spacing | AA | Raising text spacing causes no clipped or overlapping text. Avoid fixed-height text boxes. | Line height 1.5x, paragraph gap 2x, letter spacing 0.12x, word spacing 0.16x font size |
| W-1.4.1 Use of Color | A | Colour is never the only signal (errors, links in text, status). | Add text, icon or underline |

## Forms and help
| ID | Level | Rule | Threshold |
|---|---|---|---|
| W-3.3.2 Labels or Instructions | A | Every input has a visible label or instruction, including format hints. | One visible label per field; a placeholder alone is not enough |
| W-3.3.1 Error Identification | A | A detected error is named in text and the field is identified. | Text message per invalid field |
| W-3.3.3 Error Suggestion | AA | If a fix is known, state it. | Message gives the correction (e.g. "Enter an email like name@example.com") |
| W-3.3.7 Redundant Entry | A | In one process, do not ask again for info already given; prefill or let users pick it. | No repeated fields in one flow |
| W-3.3.8 Accessible Authentication (Minimum) | AA | Login must not depend on remembering, transcribing or solving something unless an alternative exists. Allow paste and password managers. | No cognitive-test-only step; paste not blocked |
| W-3.2.6 Consistent Help | A | Help (contact link, phone, chat, FAQ link) sits in the same relative place on every page where it appears. | Same position and order across pages |

## Structure and links
| ID | Level | Rule | Threshold |
|---|---|---|---|
| W-1.3.1 Info and Relationships | A | Structure shown visually (headings, lists, labels, groups) is also in the markup. | Use h1-h6, ul/ol, label[for], fieldset/legend |
| W-2.4.6 Headings and Labels | AA | Headings and labels describe their topic or purpose. | Specific text; no "Section 2" or "More" |
| W-2.4.10 Section Headings | AAA | Content is divided by section headings. | One heading per section; one h1; no skipped levels (best practice) |
| W-2.4.4 Link Purpose (In Context) | A | A link's purpose is clear from its text plus surrounding context. | No bare "click here" or "read more" without context; add visually hidden text or aria-label when cards repeat the same label |

## Quick audit checklist
1. Tab through the page: focus ring visible and never hidden under the sticky header (W-2.4.7, W-2.4.11).
2. Zoom to 400% in a 1280px window: no sideways scroll (W-1.4.10).
3. Body text contrast >= 4.5:1; input borders and outline buttons >= 3:1 (W-1.4.3, W-1.4.11).
4. Every button and link >= 24px (aim 44px), spaced apart (W-2.5.8).
5. Every input has a visible label; errors are text next to the field with a fix hint (W-3.3.2, W-3.3.1, W-3.3.3).
