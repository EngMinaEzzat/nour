---
name: Architectural Minimalist System
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#605e5c'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2df'
  on-secondary-container: '#666462'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c1c'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e6e2df'
  secondary-fixed-dim: '#c9c6c3'
  on-secondary-fixed: '#1c1b1a'
  on-secondary-fixed-variant: '#484645'
  tertiary-fixed: '#e3e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Metropolis
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Metropolis
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Metropolis
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.15em
  functional-sm:
    fontFamily: Metropolis
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
spacing:
  unit: 8px
  container-max: 1440px
  margin-desktop: 80px
  margin-mobile: 20px
  gutter: 24px
  hairline: 1px
---

## Brand & Style

This design system is a study in "Quiet Luxury" and architectural discipline. It draws inspiration from the interplay of light and shadow on Cairo’s brutalist concrete structures and the serene, expansive interiors of modern Egyptian galleries. 

The personality is authoritative yet hushed, favoring structural integrity over decorative flourish. The UI evokes an emotional response of clarity, permanence, and high-end exclusivity.

**Core Principles:**
- **Materiality over Effect:** No shadows or gradients are permitted. Depth is created through value shifts (color) and structural layering.
- **Architectural Void:** Whitespace is treated as a physical material. Large, deliberate empty spaces direct focus and convey a sense of premium breathing room.
- **Precision:** Every element must align to a strict mathematical grid, echoing the rhythmic pillars and slabs of brutalist forms.
- **The Hairline:** Use ultra-thin (0.5pt to 1pt) borders to define edges, mimicking architectural drafting lines and sophisticated metal inlay.

## Colors

The palette is strictly monochromatic, reflecting the stone, concrete, and basalt textures of Egyptian modernism. 

- **Bone (#FAF9F6 / #F5F5F3):** The primary canvas. It provides a warmer, more sophisticated feel than pure white, reminiscent of limestone.
- **Charcoal & Ebony (#121212 / #080808):** Used for primary typography and structural "weights." These provide the high-contrast "anchor" for the design.
- **Soft Grey (#8C8C8C):** Utilized for hairlines, secondary data, and architectural subtle textures.

Color application should be planar. Large blocks of Bone meet Charcoal edges with zero transition.

## Typography

The typographic hierarchy relies on the tension between the romantic, high-contrast Serif and the cold, geometric Sans-Serif.

- **Headlines:** Playfair Display is used for editorial moments. It should be typeset with tight tracking in large sizes to emphasize its architectural silhouette.
- **Body & Functional:** Metropolis provides the geometric precision required for functional text.
- **The "Label-Caps" Role:** Used for navigational links, category labels, and small metadata. The high letter-spacing (tracking) is essential to create a "luxury" feel.
- **Alignment:** Stick to flush-left/rag-right for body text. Centered text should be reserved exclusively for high-level editorial headers.

## Layout & Spacing

The layout is a rigid 12-column grid system inspired by architectural blueprints. 

- **Grid System:** 12 columns on desktop, 4 columns on mobile. 
- **The "Hairline" Grid:** Every major section should be separated by a 1px "Soft Grey" or "Charcoal" line. These lines should extend to the edges of the container, creating a "blueprint" effect.
- **Spacing Rhythm:** Use a strict 8px base unit. Vertical rhythm is critical; give elements significant breathing room—margins between sections should be 2x or 3x what is typically expected (e.g., 160px or 240px) to emphasize the "Quiet Luxury" aesthetic.
- **In-set Padding:** Content within cards or modules should have generous, uniform padding (minimum 40px) to prevent the "cramped" look of consumer-grade interfaces.

## Elevation & Depth

This system rejects shadows. Depth is achieved through **Tonal Planarity** and **Hairline Partitioning**.

1.  **Level 0 (Base):** Bone (#FAF9F6).
2.  **Level 1 (Interaction/Overlays):** Accents of Ebony (#080808) for high-contrast modals or drawer menus that slide in like solid slabs.
3.  **Level 2 (Active Elements):** Soft Grey (#E8E4E1) containers for secondary information.

When an element is "elevated" (such as a modal), it does not cast a shadow. Instead, it uses a sharp 1px Ebony border or a dimming "scrim" of 40% Charcoal over the background. The result is a UI that feels like a series of stacked, physical materials.

## Shapes

The shape language is strictly **Sharp (0px)**. 

Curves are perceived as soft and organic, which contradicts the brutalist, architectural intent. Every button, input field, card, and image container must have 90-degree corners. 

Consistency in these sharp edges creates a sense of mathematical perfection and structural rigor. Even "pills" or "chips" are replaced by rectangular tags with hairline borders.

## Components

- **Buttons:** 
  - *Primary:* Solid Ebony background, Bone text, Sharp corners. No hover shadow; hover state should be a color inversion (Bone background, Ebony text/border).
  - *Secondary:* Transparent background, 1px Hairline border in Charcoal.
- **Input Fields:** 
  - No background fill. Only a 1px bottom-border (like a signature line) or a full 1px hairline box. Labels use the `label-caps` typography style.
- **Cards:** 
  - Defined by 1px hairlines. Images within cards should be flush to the top and sides, with no border-radius.
- **Lists:** 
  - Separated by horizontal 1px hairlines. High vertical padding (24px-32px) between list items.
- **Product Imagery:** 
  - Should be treated as an architectural element. Use consistent aspect ratios (e.g., 4:5 or 1:1) and consider monochromatic or desaturated photography styles.
- **Navigation:**
  - Minimalist top-bar. Links use `label-caps` with a 1px bottom-border that appears on hover/active states.