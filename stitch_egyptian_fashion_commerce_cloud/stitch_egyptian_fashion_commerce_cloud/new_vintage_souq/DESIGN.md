---
name: New-Vintage Souq
colors:
  surface: '#fff8f3'
  surface-dim: '#e6d8c5'
  surface-bright: '#fff8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff2e2'
  surface-container: '#fbecd9'
  surface-container-high: '#f5e6d3'
  surface-container-highest: '#efe0cd'
  on-surface: '#221a0f'
  on-surface-variant: '#54433c'
  inverse-surface: '#372f22'
  inverse-on-surface: '#feefdb'
  outline: '#87736b'
  outline-variant: '#dac1b8'
  surface-tint: '#944925'
  primary: '#823b18'
  on-primary: '#ffffff'
  primary-container: '#a0522d'
  on-primary-container: '#ffe1d6'
  inverse-primary: '#ffb596'
  secondary: '#50652a'
  on-secondary: '#ffffff'
  secondary-container: '#cfe99f'
  on-secondary-container: '#546a2e'
  tertiary: '#794200'
  on-tertiary: '#ffffff'
  tertiary-container: '#975915'
  on-tertiary-container: '#ffe3cd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcd'
  primary-fixed-dim: '#ffb596'
  on-primary-fixed: '#360f00'
  on-primary-fixed-variant: '#76320f'
  secondary-fixed: '#d2eca2'
  secondary-fixed-dim: '#b6d088'
  on-secondary-fixed: '#131f00'
  on-secondary-fixed-variant: '#394d14'
  tertiary-fixed: '#ffdcc1'
  tertiary-fixed-dim: '#ffb877'
  on-tertiary-fixed: '#2e1600'
  on-tertiary-fixed-variant: '#6c3a00'
  background: '#fff8f3'
  on-background: '#221a0f'
  surface-variant: '#efe0cd'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 36px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  section-gap: 80px
---

## Brand & Style

The brand personality is that of a "Sophisticated Storyteller"—balancing the dusty, soulful atmosphere of an ancient Egyptian bazaar with the precise curation of a high-end modern gallery. It targets global connoisseurs and local enthusiasts who value provenance and the mark of the maker's hand.

The design style is **Tactile Heritage Modernism**. It eschews the sterile nature of modern e-commerce in favor of a sensory-rich experience. This is achieved through organic textures (linen, stone, grain) and a curated, asymmetrical layout that mimics the discovery-led journey of wandering through a historic district. The emotional response should be one of "Warm Nostalgia"—feeling instantly familiar, high-quality, and deeply grounded in the Egyptian earth.

## Colors

The palette is "Sun-Drenched and Earth-Bound," pulling directly from the Egyptian landscape and artisanal materials.

*   **Primary (Terracotta):** A rich, burnt clay used for primary actions and brand emphasis.
*   **Secondary (Deep Olive):** Derived from desert flora, used for success states, category markers, and grounding elements.
*   **Tertiary (Burnt Ocher):** A vibrant, earthy mid-tone for secondary interactions.
*   **Neutral (Desert Sand):** The primary background color, providing a softer, warmer alternative to white, reminiscent of weathered limestone.
*   **Accent (Aged Copper):** A matte, metallic tone used sparingly for iconography and fine decorative details.

Avoid pure blacks; use a "Deep Charcoal" (#2D2926) for text to maintain a softer, vintage print feel.

## Typography

The typography strategy relies on the tension between the historical and the functional.

**Headings (Libre Caslon Text):** This serif carries a vintage editorial weight, suggesting heritage and storytelling. Use it for product titles, section headers, and quotes. Large display sizes should use tighter letter spacing to feel like a boutique magazine cover.

**Body & UI (Work Sans):** A clean, grounded sans-serif that ensures high readability for product descriptions and technical details. Its neutral character allows the serif headings to remain the focal point.

**Labels:** Always use Work Sans in semi-bold, often in all-caps with generous tracking for a "stamped" or "archival" look on tags and categories.

## Layout & Spacing

The layout philosophy is **Curated Asymmetry**. Rather than a rigid, repetitive grid, the design system utilizes offset alignments to create a rhythmic, boutique feel.

*   **Grid Model:** Use a 12-column grid for desktop, but frequently break the "expected" placement. For example, a product image may span columns 2-7, while its description begins on column 8 but is vertically offset.
*   **White Space:** Treat white space (or "Sand Space") as a physical material. Use generous margins to give high-end artisanal products "room to breathe."
*   **Breakpoints:**
    *   *Mobile (<600px):* Single column, centered content, 16px margins.
    *   *Tablet (600px - 1024px):* 6-column fluid grid with 24px margins.
    *   *Desktop (>1024px):* 12-column fixed grid (max-width 1440px) with 64px margins.

## Elevation & Depth

Depth is conveyed through **Physical Materiality** rather than digital shadows.

*   **Tonal Layering:** Use slight variances in neutral tones (e.g., a "Linen" colored surface on top of a "Sand" background) to indicate hierarchy.
*   **Texture Overlays:** Apply a subtle, low-opacity paper grain or stone texture to the primary background to eliminate the "flatness" of the screen.
*   **Matte Insets:** Instead of protruding shadows, use thin (1px) inner borders in a slightly darker earth tone to create "sunken" fields or "pressed" areas.
*   **Shadows:** When necessary for functional elevation (like a floating cart), use "Ambient Clay" shadows—extremely diffused, low-opacity (#2D2926 at 8%), with zero blur-offset to simulate an object resting on a soft surface.

## Shapes

The shape language is **Soft-Rectilinear**. It avoids the clinical precision of sharp 90-degree angles but stays away from the "bubbly" feel of high-roundedness.

*   **Corner Radii:** A consistent 0.25rem (4px) radius is applied to buttons and inputs to mimic the slightly weathered edges of hand-cut stone or thick-pressed paper.
*   **Organic Containers:** For featured imagery, consider occasional "archway" crops (rounded top, flat bottom) to echo traditional Islamic and Coptic architectural motifs.
*   **Dividers:** Use horizontal rules that resemble a single linen thread—1px thick, slightly textured, and never spanning the full width of the container.

## Components

*   **Buttons:** Primary buttons use a solid Terracotta background with "Sand" text. Secondary buttons are "Aged Copper" outlines. Avoid hover effects that feel "electric"; instead, use a subtle darken or a slight shift in texture intensity.
*   **Input Fields:** Ghost-style inputs with a bottom-border only (1px Matte Bronze). Labels float above in all-caps Work Sans.
*   **Cards:** Product cards should not have borders or heavy shadows. Use a "Flat-on-Sand" approach where the image is the hero, followed by an asymmetrical layout of text underneath.
*   **Chips/Tags:** Small, pill-shaped tags in "Deep Olive" with low-contrast text, resembling a woven garment label.
*   **Icons:** Use "Aged Copper" for icon strokes. Lines should be thin and slightly imperfect, as if hand-drawn or etched into metal.
*   **Unique Component - "The Provenance Seal":** A circular, badge-like component used on product pages to certify authenticity, utilizing the Aged Copper color and Libre Caslon typography.