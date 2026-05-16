---
name: Modern Egyptian Elegance
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#3f4945'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#707975'
  outline-variant: '#bfc9c4'
  surface-tint: '#29695b'
  primary: '#00342b'
  on-primary: '#ffffff'
  primary-container: '#004d40'
  on-primary-container: '#7ebdac'
  inverse-primary: '#94d3c1'
  secondary: '#775a19'
  on-secondary: '#ffffff'
  secondary-container: '#fed488'
  on-secondary-container: '#785a1a'
  tertiary: '#2d2f1e'
  on-tertiary: '#ffffff'
  tertiary-container: '#434533'
  on-tertiary-container: '#b1b29b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#afefdd'
  primary-fixed-dim: '#94d3c1'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#065043'
  secondary-fixed: '#ffdea5'
  secondary-fixed-dim: '#e9c176'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4201'
  tertiary-fixed: '#e4e4cc'
  tertiary-fixed-dim: '#c8c8b0'
  on-tertiary-fixed: '#1b1d0e'
  on-tertiary-fixed-variant: '#474836'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-tablet: 32px
  margin-mobile: 16px
---

## Brand & Style
This design system captures the essence of "Modern Egyptian Elegance" for the high-end fashion and cosmetics enterprise sector. The brand personality is authoritative yet graceful, merging the structural permanence of ancient architecture with the fluid luxury of modern haute couture. The target audience includes global brand managers and retail executives who demand a professional, reliable SaaS experience that mirrors the prestige of their own products.

The visual style is a refined **Corporate Minimalism**. It avoids clutter in favor of spaciousness and high-quality typography. The aesthetic utilizes "Desert Gold" as a precision accent against the stabilizing "Deep Teal," creating a UI that feels like a luxury boutique’s digital headquarters.

## Colors
The palette is rooted in a balance of earth and prestige. 
- **Deep Teal (#004D40):** The primary anchor. Used for primary navigation, high-level headers, and core action states to signify stability and depth.
- **Desert Gold (#C5A059):** The precision accent. Used sparingly for calls-to-action, active indicators, and subtle decorative borders to evoke luxury.
- **Sand (#F5F5DC):** Used for large-scale section backgrounds and subtle tonal shifts to prevent the interface from feeling starkly white.
- **Charcoal (#333333):** The foundation for readability. Used for primary body text and iconography to maintain high contrast.

System states (Success, Error, Warning) should use desaturated versions of standard semantical colors to remain cohesive with the muted, high-end palette.

## Typography
The typographic hierarchy relies on the high contrast between the editorial **Playfair Display** and the geometric **Montserrat**. 

For Arabic language support, **Noto Serif Arabic** is the designated fallback for headings to maintain the high-contrast serif aesthetic, while **Montserrat** (via Google Fonts' multi-script support) or **IBM Plex Sans Arabic** should be used for body text to ensure legibility in data-heavy SaaS views. 

Headings should be treated with generous vertical rhythm. The `label-caps` style is specifically intended for small metadata, table headers, and overlines to add an architectural, structured feel to the layout.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to maintain a curated, gallery-like feel, centering the content at a maximum width of 1440px. 

A 12-column grid is utilized for dashboard layouts, while editorial content (like fashion reports) should use a centered 8-column span to increase whitespace. Spacing follows an 8px base unit. Negative space is considered a first-class citizen in this design system; margins are intentionally larger than standard SaaS benchmarks to emphasize exclusivity and reduce cognitive load. 

On mobile, the 12-column grid collapses to 4 columns, and the desktop's 64px margins reduce to 16px to maximize the limited screen real estate while maintaining the 8px grid alignment.

## Elevation & Depth
Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. Instead of heavy black shadows, this design system uses extra-diffused shadows tinted with the primary Deep Teal (e.g., `rgba(0, 77, 64, 0.08)`).

1.  **Level 0 (Base):** The Sand (#F5F5DC) or Off-white (#FCFCF9) background.
2.  **Level 1 (Cards):** White surfaces with a soft, 16px blur shadow. Used for the main content containers.
3.  **Level 2 (Dropdowns/Modals):** White surfaces with a 32px blur shadow and a subtle 1px border in a pale Gold or Teal tint.
4.  **Interactive Depth:** Elements like buttons do not "lift" on hover; instead, they undergo a color shift or a subtle expansion of the gold accent, maintaining a flat, sophisticated profile.

## Shapes
The shape language is primarily **Soft (0.25rem)**. This slight rounding removes the harshness of enterprise software while maintaining a sense of architectural precision. 

- **Cards and Containers:** Use `rounded-lg` (0.5rem) to provide a gentle frame for fashion imagery.
- **Buttons:** Use `rounded-sm` (0.25rem) to keep them looking sharp and professional.
- **Input Fields:** Use 0px or `rounded-sm` to emphasize a "structured" data entry experience.
Avoid pill-shaped elements unless used for high-visibility status tags or "chips" to ensure the interface doesn't lean too "playful" or "consumer-grade."

## Components
- **Buttons:** Primary buttons are solid Deep Teal with white text. Secondary buttons use a Desert Gold border with Teal text. Ghost buttons use Desert Gold text with no background. All buttons feature a 2px bottom-border accent in Desert Gold on hover.
- **Cards:** Clean white backgrounds, `rounded-lg` corners, and a 1px Desert Gold top-border for "featured" content. Shadows are soft and diffused.
- **Input Fields:** Minimalist design with only a bottom-border (2px) in Charcoal, which transitions to Deep Teal on focus. Labels use the `label-caps` typography style.
- **Chips/Badges:** Use a pale tint of the Sand color with a Deep Teal or Desert Gold border. Text is always centered and in `body-sm` bold.
- **Lists:** Data tables and lists use generous 16px padding between rows. Row separators are thin (1px) lines in a 10% opacity Charcoal.
- **Navigation:** A vertical sidebar in Deep Teal with Desert Gold active-state indicators (a vertical 4px bar on the leading edge).
- **Specialty Component - "The Lookbook Carousel":** A specialized component for the fashion industry that uses high-aspect-ratio image containers with Playfair Display captions overlaying a 20% gradient.