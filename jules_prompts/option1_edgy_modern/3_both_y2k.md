📋 **The Prompt to feed into Jules:**

You are an expert Senior Frontend Engineer and UX/UI Designer. Your goal is to introduce a completely new visual theme for our `both` (Fashion & Cosmetics) store category.

The new theme must be **"y2k-nostalgia"**. It should look completely different from the current default options, bringing a bright, holographic, Gen-Z nostalgic aesthetic with brand-new default imagery, tone, and localized copy.

You must implement this without breaking the existing styles and while adhering strictly to the project's accessibility and security guardrails.

---

### Phase 1: Design System & Configuration (StitchMCP)
1. **Initialize/Register the Design System**: Use the `StitchMCP` tool (`create_design_system`) to register a new design system with the following tokens:
   - **Colors**:
     - Primary: `#ff007f` (Bubblegum Pink)
     - Secondary: `#e0f7fa` (Holographic Ice Blue)
     - Main Background: `#fff5f7` (Sweet Pink Ice)
     - Section Background: `#ffffff`
     - Card Background: `#ffffff`
     - Border Color: `#fbcfe8`
     - Text Heading: `#4d003b`
     - Text Body: `#831843`
   - **Typography**: Playful serif-sans font pairing (e.g., `'Playfair Display', Georgia, serif` for headings, `system-ui, -apple-system, sans-serif` for body).
   - **Border Radii & Buttons**: Rounded pill button style (`9999px` border-radius) and extremely soft card corners (`24px` border-radius) with playful shadows.
2. **Codebase Integration**:
   - In `src/lib/store-config.ts`, expand the `StyleType` union to include `"y2k-nostalgia"`.
   - Expand the `PersonalityType` union to include `"y2k"`.
   - Add the `"y2k"` personality configuration to the `PERSONALITY_PRESETS` object utilizing the colors, fonts, and border-radii defined above.
   - Add `"y2k-nostalgia"` to the `STYLE_PRESETS` object, specifying the optimal section order: `Hero`, `Trust Strip`, `Categories`, `New Arrivals`, `Best Sellers`, `Offers`, `Lookbook`, `Instagram (UGC)`, `Newsletter`, `About`, `WhatsApp`.

---

### Phase 2: Complete i18n Localization (English & Arabic)
1. Edit `src/locales/en/translation.json` and `src/locales/ar/translation.json`.
2. Add the following highly distinct localized default copies under the key `defaultSections.y2kNostalgia`:

| Section | Field | English Translation | Arabic Translation |
|---|---|---|---|
| **Hero** | `heading` | "Retro Glamour, Today's Vibe at {{storeName}}" | "بريق الألفينات بلمسة عصرية في {{storeName}}" |
| | `subheading` | "Step into the glitter fantasy and holographic aesthetics" | "ادخلي إلى عالم خيالي من البريق والألوان اللامعة" |
| | `ctaText` | "Pop Your Style" | "تسوقي بأسلوبك" |
| **About** | `heading` | "Our Y2K Fantasy" | "خيال الألفينات الخاص بنا" |
| | `body` | "We are bringing back the futuristic optimism of the late 90s and early 2000s. Shiny fabrics, bubblegum shades, and pixel perfection. Celebrate self-expression with us." | "نعيد إليكِ تفاؤل المستقبل من أواخر التسعينيات وأوائل الألفينات. أقمشة لامعة، درجات الوردي البراقة، ودقة البكسل المثالية. احتفلي معنا بجرأة التعبير عن نفسكِ." |
| **Lookbook** | `heading` | "Glitter Fantasy - Hologram Daze" | "خيال البريق - عالم الهولوغرام" |
| | `items[0].title` | "Hologram\n Daze" | "طيف\n الهولوغرام" |
| | `items[0].desc` | "Futuristic shimmer meets retro vibes." | "لمعان مستقبلي يلتقي بأجواء ريترو." |
| | `items[1].title` | "Pixel\n Perfect" | "دقة\n البكسل" |
| | `items[1].desc` | "Bold prints and shiny metallic textures." | "طبعات جريئة وقوام معدني لامع." |
| | `items[2].title` | "Glitter\n Fantasy" | "خيال\n البريق" |
| | `items[2].desc` | "Pure bubblegum pink nostalgia." | "الحنين النقي إلى الوردي اللامع." |
| **Trust Strip**| `items[0]` | icon: "💖", title: "Cute Quality", text: "Handpicked candy-sweet items" | icon: "💖", title: "جودة لطيفة", text: "قطع منتقاة بعناية فائقة" |
| | `items[1]` | icon: "✨", title: "Holo Shipping", text: "Sparkly packaging, lightning fast" | icon: "✨", title: "شحن هولوغرافي", text: "تغليف براق وتوصيل سريع" |
| | `items[2]` | icon: "🎀", title: "Sweet Returns", text: "Easy returns with zero drama" | icon: "🎀", title: "إرجاع سهل", text: "إرجاع بلا أي تعقيد أو دراما" |
| | `items[3]` | icon: "⭐", title: "Star Support", text: "Friendly support, 24/7 online" | icon: "⭐", title: "دعم النجوم", text: "فريق دعم لطيف متصل على مدار الساعة" |

---

### Phase 3: Default Section Content & Imagery Generation
1. In `src/lib/store-config.ts` (`createDefaultSection`), update the factory logic to conditionally apply the y2k-nostalgia translations if selected.
2. **Generate and Save Visual Assets**:
   Use image generation prompts or design tools to produce 5 optimized, theme-appropriate visual assets. Save them directly into the `public/` directory of the storefront:
   - **`/hero-y2k-optimized.jpg`**: A bright, high-energy fashion layout featuring models posing in metallic silver puffer jackets and pink tinted sunglasses against a holographic background.
   - **`/about-y2k-optimized.jpg`**: A beautiful close-up of glitter-infused cosmetics lip gloss and sparkling pink aesthetic background.
   - **`/lookbook-1-y2k-optimized.jpg`**: A model wearing retro streetwear denim and baby tee with glitter effects.
   - **`/lookbook-2-y2k-optimized.jpg`**: Holographic cosmetics palette with metallic shimmers and pastel shades.
   - **`/lookbook-3-y2k-optimized.jpg`**: Retro-futuristic flip phone with stickers on a glossy pink background.
3. Map these newly generated image URLs as the default fallbacks for the y2k-nostalgia style in configuration code.

---

### Phase 4: Architectural & Security Guardrails
1. Do NOT modify Vite configuration, core routing, database schemas, or component internals.
2. Do NOT remove any existing themes, keys, or types. You are *adding*, not replacing.
3. Ensure all icon-only buttons have a translated `aria-label` using `t()`.
4. Ensure RTL layout compatibility is perfectly maintained.

---

### Phase 5: Verification & Validation
Once completed, run:
1. `pnpm run typecheck --filter @workspace/fashion-store`
2. `pnpm run test --filter @workspace/fashion-store`
3. `pnpm run build --filter @workspace/fashion-store`