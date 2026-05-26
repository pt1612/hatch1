# OTTOZEROUNO Brand Guidelines

This document defines the visual identity to apply to Hatch, derived from the OTTOZEROUNO Brand Manual 2026. Use it as the single source of truth when styling components, pages, and design tokens.

---

## 1. Colors

All colors must be defined as design tokens (CSS variables or Tailwind theme extension), never hardcoded in components.

### Primary palette

| Name          | HEX       | Usage                                                 |
|---------------|-----------|-------------------------------------------------------|
| Deep Teal     | `#183C40` | Primary text, dark backgrounds, dark mode surfaces    |
| Wispy Clouds  | `#F2F2F2` | Light background, neutral surface                     |
| Sea Green     | `#13A389` | Brand primary, CTAs, key interactive elements         |

### Secondary and accent palette

| Name          | HEX       | Usage                                                 |
|---------------|-----------|-------------------------------------------------------|
| Bluejay       | `#138BA3` | Secondary accents, info states, alternative CTAs      |
| Aruba Blue    | `#6FE2D6` | Highlights, badges, decorative shapes                 |
| Fair Aqua     | `#B3E9DD` | Soft backgrounds, hover states, subtle surfaces       |
| Jojoba        | `#DCBF85` | Warm accent, sparingly                                |
| Celandine     | `#F5E663` | Attention accent, sparingly (warnings, highlights)    |

### Color usage rules

- Sea Green is the brand color. Use it for primary CTAs, active states, and brand moments.
- Deep Teal is the default text color on light backgrounds. Wispy Clouds is the default text on Deep Teal backgrounds.
- Light cards on light backgrounds should use Wispy Clouds with subtle borders, not pure white.
- Accent colors (Jojoba, Celandine) are for emphasis only. Do not use them as primary surfaces.
- Maintain WCAG AA contrast (4.5:1 for body text, 3:1 for large text) when combining colors.
- Aruba Blue and Fair Aqua work well as backgrounds for cards on the Sea Green or Deep Teal canvas.

### Suggested semantic mapping

```
--color-background:        #F2F2F2   /* Wispy Clouds */
--color-foreground:        #183C40   /* Deep Teal */
--color-primary:           #13A389   /* Sea Green */
--color-primary-foreground:#F2F2F2
--color-secondary:         #138BA3   /* Bluejay */
--color-accent:            #6FE2D6   /* Aruba Blue */
--color-muted:             #B3E9DD   /* Fair Aqua */
--color-surface-dark:      #183C40   /* Deep Teal */
--color-warning:           #F5E663   /* Celandine */
--color-warm:              #DCBF85   /* Jojoba */
```

---

## 2. Typography

### Font family

- **DM Sans** for all text. Load via Google Fonts or `next/font/google` if Next.js is used.
- Weights required: 400 (Regular), 500 (Medium), 700 (Bold), with italics for each.
- No serif fallback. System fallback chain: `'DM Sans', system-ui, -apple-system, sans-serif`.

### Type scale

The brand manual defines six base sizes. Treat them as the canonical scale:

| Role         | Font     | Weight  | Size  | Notes                                  |
|--------------|----------|---------|-------|----------------------------------------|
| Heading 1    | DM Sans  | Bold    | 54px  | Page titles, hero headlines            |
| Heading 2    | DM Sans  | Bold    | 40px  | Section titles                         |
| Heading 3    | DM Sans  | Regular | 40px  | Lighter section titles, large quotes   |
| Body large   | DM Sans  | Medium  | 14px  | Default body text                      |
| Caption 1    | DM Sans  | Bold    | 14px  | Emphasized labels, small headers       |
| Caption 2    | DM Sans  | Regular | 14px  | Standard small text                    |
| Footnote     | DM Sans  | Regular | 12px  | Metadata, secondary captions           |

For responsive UI, scale Heading 1 and 2 down proportionally on mobile (Heading 1 around 36-40px on small screens).

### Typography rules

- Headings use Deep Teal on light backgrounds, Wispy Clouds on dark.
- Body text: Deep Teal at default opacity. Avoid grays — adjust opacity of Deep Teal instead (e.g. 70% for muted text).
- Line height: 1.2 for headings, 1.5 for body, 1.4 for small text.
- Letter spacing: default for headings, slightly tightened (-0.01em) for large displays only.
- Captions in uppercase tracking (around 0.05em) work well — see the manual's `CAPTION 2` style.

---

## 3. Logo

The OTTOZEROUNO logo has four variations: main (vertical), horizontal, symbol (OZU mark), wordmark. All four exist in Deep Teal, Sea Green, white-on-dark, and white-on-Sea-Green color modes.

### Logo usage in Hatch

- Decide upfront whether Hatch uses its own logo with OTTOZEROUNO visual DNA, or appears as an OTTOZEROUNO product (e.g. "by OTTOZEROUNO" lockup). Do not invent a logo without instruction.
- If using the OTTOZEROUNO symbol (OZU), always render it as a vector SVG, not a raster image.
- The brand name OTTOZEROUNO is always written in **all caps** in body copy. The wordmark itself uses the custom lowercase rendering — that is the logo, not the text spelling.

### Minimum sizes

- Full logo (main, horizontal, wordmark): 200px on screen, 2.3cm in print.
- Symbol only: 69px on screen, 0.8cm in print.
- Never scale below these sizes.

### Safety spacing

Leave a clear area around the logo equal to roughly the height of the OZU symbol on all sides. No other element (text, image, edge of frame) should enter that zone.

### Don'ts

- Do not distort proportions.
- Do not alter the size of individual logo elements relative to each other.
- Do not recolor parts of the logo independently.
- Do not place the logo on busy photographic backgrounds without a solid color overlay.

---

## 4. Visual elements and decorative graphics

These are essential to the brand identity. Do not skip them in favor of a flat, minimal look — they are what makes OTTOZEROUNO recognizable.

### 4.1 Rounded shapes

The brand uses three rounding patterns. All three should be available as utility classes or component variants.

- **Rounded corner**: a single corner rounded heavily (one corner only). Used on cards, image frames, hero containers. Implementation: `border-radius: 0 80px 0 0;` (or similar — one corner with a large radius, others square).
- **Rounded corners**: all four corners with a generous radius. Used on pills, buttons, small cards. Implementation: `border-radius: 24px` or pill (`border-radius: 9999px`) depending on element.
- **Rounded shapes**: large circular or half-circular shapes used as background decoration. Implementation: oversized SVG circles or `border-radius: 50%` divs, positioned absolute, often bleeding off the canvas edge.

### 4.2 Stacked shapes

Multiple shapes (rectangles or rounded corners) layered with slight offset and varying colors from the palette. Used as decorative anchors on hero sections, card corners, page transitions.

Implementation guidance:
- Use 2-3 overlapping shapes, never more.
- Mix colors from primary + accent (e.g. Sea Green + Bluejay + Aruba Blue).
- Offset each shape by 8-16px on both axes.
- Position absolute behind or beside content, not overlapping critical text.

### 4.3 Line art (1px)

Multi-line, multi-traced outlines of the OZU symbol or geometric shapes. Used as large-scale decorative backgrounds, especially on social cards and hero sections.

Implementation guidance:
- Stroke width: exactly 1px.
- Color: Deep Teal or Sea Green at full opacity, or any palette color at 20-40% opacity for subtler backgrounds.
- Render as inline SVG so stroke width stays crisp at any scale.
- Common pattern: the same shape repeated 4-6 times with small positional offsets (2-4px each), creating a layered echo.
- Position behind content with `position: absolute` and `z-index: 0`.

Example SVG structure for a stacked line-art circle decoration:

```html
<svg viewBox="0 0 400 400" class="absolute -right-20 top-10 w-96 opacity-30">
  <g fill="none" stroke="#183C40" stroke-width="1">
    <circle cx="200" cy="200" r="180" />
    <circle cx="203" cy="197" r="180" />
    <circle cx="206" cy="194" r="180" />
    <circle cx="209" cy="191" r="180" />
  </g>
</svg>
```

### 4.4 Perpendicular lines / scheming

A grid-like pattern of perpendicular 1px lines, sometimes forming nested rectangles or a sparse vertical-line backdrop. Used as quiet background texture on full-bleed sections.

Implementation guidance:
- 1px stroke, Deep Teal at 15-25% opacity.
- Use SVG with a small repeating pattern via `<pattern>` element, or hand-place lines for hero compositions.
- Keep the density low — this is texture, not noise.

### 4.5 Line icons

All icons must be in **line style** (outlined), never filled. Stroke width consistent across the icon set (1.5px or 2px). Use a library like Lucide, Phosphor (regular weight), or Tabler Icons. Avoid Material Icons filled or Heroicons solid.

---

## 5. Component styling guidance

### Buttons

- Primary: Sea Green background, Wispy Clouds text, rounded-full or 24px radius, no border.
- Secondary: transparent background, Deep Teal border (1.5px), Deep Teal text.
- Ghost: transparent, Deep Teal text only, no border.
- Hover states: darken Sea Green by ~8% for primary; fill background with Fair Aqua for secondary.
- Always use DM Sans Medium 14 for button labels.

### Cards

- Background: Wispy Clouds or white.
- Border: 1px Deep Teal at 10% opacity, or no border with a soft shadow.
- Radius: 16-24px on all corners, or single-corner rounded for hero/feature cards.
- Padding: minimum 24px, comfortable 32px.
- Optional decorative element: a stacked shape or line-art accent in one corner.

### Inputs

- Background: white or Wispy Clouds.
- Border: 1.5px Deep Teal at 20% opacity, focus state at full opacity.
- Radius: 12px.
- Padding: 12px 16px.
- Label: DM Sans Medium 14, Deep Teal.
- Placeholder: Deep Teal at 40% opacity.

### Navigation / header

- Background: Wispy Clouds or transparent on light pages, Deep Teal on dark pages.
- Logo on the left.
- Links: DM Sans Medium 14, Deep Teal, with Sea Green underline or color on active.

---

## 6. Layout principles

- Generous whitespace. The brand manual is breathable — no dense layouts.
- One brand color dominates per section. Don't mix Sea Green and Bluejay backgrounds adjacent to each other without a neutral break.
- Decorative elements (line art, stacked shapes) live in section corners or edges, never centered behind text.
- Maintain a 4px or 8px spacing grid throughout.

---

## 7. What not to do

- Do not introduce colors outside the defined palette.
- Do not use filled icons or icon styles inconsistent with line aesthetics.
- Do not use sharp 90-degree corners on cards, buttons, or images — always at least slightly rounded.
- Do not use shadows heavily. The brand relies on color contrast and shape, not depth.
- Do not use gradients except very subtle ones between two palette colors (e.g. Sea Green to Bluejay) and only for hero accents.
- Do not use the OTTOZEROUNO logo as a generic decoration. It is the brand mark, not a graphic element.

---

## 8. Implementation checklist for Hatch

When applying this guide to the Hatch codebase, proceed in this order:

1. **Design tokens**: update Tailwind config / CSS variables with the color palette and font family.
2. **Typography**: install DM Sans, update the global type scale, apply heading and body styles globally.
3. **Base components**: restyle buttons, inputs, cards, and links to match section 5.
4. **Layouts**: apply spacing, background colors, and rounded corner patterns to page containers.
5. **Decorative elements**: add line-art SVGs and stacked shapes to hero sections and key landmarks.
6. **Icons**: replace any filled icons with line-style equivalents.
7. **Accessibility check**: verify color contrasts, focus states, and keyboard navigation still work.
