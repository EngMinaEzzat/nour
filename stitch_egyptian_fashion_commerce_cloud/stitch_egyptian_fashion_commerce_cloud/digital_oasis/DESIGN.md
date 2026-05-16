---
name: Digital Oasis
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c5da'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e8fa3'
  outline-variant: '#434657'
  surface-tint: '#b9c3ff'
  primary: '#b9c3ff'
  on-primary: '#00228a'
  primary-container: '#0047ff'
  on-primary-container: '#d4d9ff'
  inverse-primary: '#0046fa'
  secondary: '#ffffff'
  on-secondary: '#2b3400'
  secondary-container: '#cdf200'
  on-secondary-container: '#5a6b00'
  tertiary: '#cec6ad'
  on-tertiary: '#35301e'
  tertiary-container: '#66604b'
  on-tertiary-container: '#e4dbc1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001257'
  on-primary-fixed-variant: '#0033c0'
  secondary-fixed: '#cdf200'
  secondary-fixed-dim: '#b4d400'
  on-secondary-fixed: '#181e00'
  on-secondary-fixed-variant: '#3f4c00'
  tertiary-fixed: '#ebe2c8'
  tertiary-fixed-dim: '#cec6ad'
  on-tertiary-fixed: '#1f1c0b'
  on-tertiary-fixed-variant: '#4c4733'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: anybody
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: anybody
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: anybody
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: anybody
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: splineSans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: splineSans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: spaceGrotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
  label-sm:
    fontFamily: spaceGrotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
This design system captures the high-velocity energy of Neo-Cairo’s youth culture. It is a "Digital Oasis" that blends the harsh, sun-drenched textures of the city with the hyper-saturated glow of global streetwear and sneaker culture. The aesthetic is unapologetically mobile-first, prioritizing vertical content consumption, social-media-ready layouts, and tactile, high-energy interactions.

The style is a fusion of **High-Contrast Boldness** and **Glassmorphism**. It utilizes heavy color-blocking to create structural hierarchy, overlaid with translucent, blurred layers that suggest depth and digital sophistication. The goal is to evoke a sense of "the drop"—that fleeting, high-adrenaline moment of exclusive access, whether it's a new skincare line or a limited sneaker release.

## Colors
The palette is built on extreme contrast to command attention in crowded social feeds.

*   **Primary (Electric Blue):** A high-vibrancy blue used for primary actions, critical branding, and "glow" effects.
*   **Secondary (Neon Mint):** A sharp, acidic green-yellow used for accents, success states, and price tags to ensure high visibility.
*   **Tertiary (Sand):** A warm, neutral tone that grounds the digital vibrancy, referencing the Cairene landscape and "clean girl" aesthetic palettes.
*   **Neutral (Midnight):** An almost-black base that allows the neon elements and glass layers to pop with maximum intensity.

Color blocking should be aggressive. Use large spans of Sand against Midnight, with Electric Blue text or borders to create a vibrating, high-energy interface.

## Typography
Typography in this design system is dynamic and expressive. 

**Anybod**y is the engine for headlines, used in its boldest weights to create an editorial, "poster-like" feel. It should be typeset with tight tracking for a compressed, urgent look. **Spline Sans** provides a fresh, youthful energy for body copy, maintaining readability while feeling less "corporate" than standard sans-serifs. **Space Grotesk** is used for labels and technical data (prices, dates, sizes), providing a futuristic, slightly technical edge that resonates with sneaker-head culture.

Always use large-scale typography that overlaps images or containers to create a sense of three-dimensional space within the 2D screen.

## Layout & Spacing
This design system utilizes a **fluid grid** that prioritizes the vertical "scroll" of mobile devices. 

*   **Mobile:** 4-column grid with 20px margins. Gutters are kept tight (16px) to maximize screen real estate for imagery.
*   **Desktop:** 12-column grid centered in the viewport.
*   **Philosophy:** Elements are often intentionally "broken" from the grid. Use negative margins and absolute positioning to allow images, text, and chips to overlap one another. This creates a collage-like aesthetic common in high-end streetwear lookbooks. 

Spacing follows a 4px base unit, but transitions between major sections should use `stack-lg` to create clear breathing room between high-intensity blocks of content.

## Elevation & Depth
Depth is achieved through **Glassmorphism** and **Z-axis Layering** rather than traditional shadows.

1.  **Base Layer:** Solid Midnight or Sand color-blocked sections.
2.  **Mid Layer:** Content containers with 40% opacity backgrounds and a 20px-40px Backdrop Blur. These should have a subtle 1px inner-border (stroke) in a lighter tint of the background color to define edges.
3.  **Top Layer:** Floating buttons or chips with high-vibrancy solid colors (Electric Blue or Neon Mint) to sit on top of glass layers.

Shadows, when used, are never neutral. They should be "glows"—using the Primary or Secondary color at low opacity with a large spread (e.g., `0px 10px 30px rgba(0, 71, 255, 0.3)`).

## Shapes
The shape language is modern and "chunky." 

A `roundedness` of **2** (0.5rem base) provides a soft but disciplined look. Use `rounded-xl` (1.5rem) for main content cards to give them a premium, tactile feel. Buttons should remain strictly rectangular with `rounded-md` corners or full `pill` shapes for a sportier look. 

"Video-ready containers" must maintain a 9:16 or 4:5 aspect ratio and use the standard `rounded-lg` corner radius to match the hardware curves of modern smartphones.

## Components
*   **Buttons:** Primary buttons are solid Electric Blue with White text, using `label-bold`. Secondary buttons use the "Glass" effect with a Neon Mint border.
*   **Chips/Tags:** Used for "In Stock" or "New Drop" labels. These should be high-contrast (e.g., Neon Mint background with Midnight text) and use `label-sm`.
*   **Cards:** Cards should feel like physical objects. Use a mix of full-bleed imagery and glassmorphic overlays for the text content.
*   **Input Fields:** Ghost-style inputs with a 2px bottom border only, or fully enclosed glassmorphic fields for a more "tech" feel. Focus states must use a vibrant Electric Blue glow.
*   **Video Containers:** Always include a subtle "Live" or "Rec" indicator in the corner to lean into the social-media-ready vibe. Use a 10% black gradient overlay at the bottom of video containers to ensure white typography remains legible.
*   **Progress Bars:** Thin, high-vibrancy lines (Neon Mint) that sit at the very top of cards or headers to indicate "drop" timing or story progression.