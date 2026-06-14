📋 **The Prompt to feed into Jules:**

You are an expert Senior Frontend Engineer and UX/UI Designer. Your goal is to introduce a completely new visual theme for our `fashion` store category.

The new theme must be **"streetwear-cyberpunk"**. It should look completely different from the current default options, bringing a dark mode, neon-accented, high-energy aesthetic with brand-new default imagery, tone, and localized copy.

You must implement this without breaking the existing styles and while adhering strictly to the project's accessibility and security guardrails.

---

### Phase 1: Design System & Configuration (StitchMCP)
1. **Initialize/Register the Design System**: Use the `StitchMCP` tool (`create_design_system`) to register a new design system with the following tokens:
   - **Colors**:
     - Primary: `#39ff14` (Neon Green)
     - Secondary: `#0f0f11` (Cyber Matte Black)
     - Main Background: `#0f0f11`
     - Section Background: `#111113`
     - Card Background: `#1c1c1e`
     - Border Color: `#2c2c2e`
     - Text Heading: `#ffffff`
     - Text Body: `#a1a1aa`
   - **Typography**: Monospace / Brutalist Sans-Serif font pairing (e.g., `Courier New, Courier, monospace` for headings, `system-ui, sans-serif` for body).
   - **Border Radii & Buttons**: Square button style (`0px` border-radius) and square card corners (`0px` border-radius).
2. **Codebase Integration**:
   - In `src/lib/store-config.ts`, expand the `StyleType` union to include `"streetwear-cyberpunk"`.
   - Expand the `PersonalityType` union to include `"cyberpunk"`.
   - Add the `"cyberpunk"` personality configuration to the `PERSONALITY_PRESETS` object utilizing the colors, fonts, and border-radii defined above.
   - Add `"streetwear-cyberpunk"` to the `STYLE_PRESETS` object, specifying the optimal streetwear section order: `Hero`, `Trust Strip`, `Categories`, `New Arrivals`, `Best Sellers`, `Offers`, `Lookbook`, `Instagram (UGC)`, `Newsletter`, `About`, `WhatsApp`.

---

### Phase 2: Complete i18n Localization (English & Arabic)
1. Edit `src/locales/en/translation.json` and `src/locales/ar/translation.json`.
2. Add the following highly distinct localized default copies under the key `defaultSections.streetwearCyberpunk`:

| Section | Field | English Translation | Arabic Translation |
|---|---|---|---|
| **Hero** | `heading` | "Own the Streets with {{storeName}}" | "اكسر القواعد مع {{storeName}}" |
| | `subheading` | "Brutalist Urban Gear & High-Energy Aesthetics" | "تصاميم الشارع الجريئة بأجواء النيون الحية" |
| | `ctaText` | "Hack the System" | "اخترق النظام" |
| **About** | `heading` | "The Core of {{storeName}}" | "جوهر {{storeName}}" |
| | `body` | "We are the concrete rebels. Forged in neon light, crafted for the modern street explorer. We blend brutalist design with high-octane energy." | "نحن متمردو الخرسانة. وُلدنا تحت أضواء النيون، وصُممنا لمستكشفي شوارع المدينة الحديثة الذين يبحثون عن الأناقة الجريئة." |
| **Lookbook** | `heading` | "Cyber Drip - Neural Uplink" | "الجيل الجديد - الأناقة الرقمية" |
| | `items[0].title` | "Neon\n Nights" | "ليالي\n النيون" |
| | `items[0].desc` | "High visibility. Zero stealth." | "رؤية عالية. بلا تخفي." |
| | `items[1].title` | "Concrete\n Jungle" | "غابة\n الخرسانة" |
| | `items[1].desc` | "Brutalist aesthetics for the rogue." | "تصميم بروتالي للمتمردين." |
| | `items[2].title` | "Glitch\n Reality" | "خلل\n الواقع" |
| | `items[2].desc` | "Distorted reality, perfected." | "واقع مشوش، مُعاد صياغته." |
| **Trust Strip**| `items[0]` | icon: "⚡", title: "Hyper Delivery", text: "Light-speed urban shipping" | icon: "⚡", title: "شحن سريع للغاية", text: "توصيل بسرعة الضوء" |
| | `items[1]` | icon: "🔒", title: "Neural Lock", text: "100% encrypted checkout" | icon: "🔒", title: "دفع آمن بالكامل", text: "عمليات دفع مشفرة 100%" |
| | `items[2]` | icon: "🔄", title: "System Reboot", text: "Instant hassle-free returns" | icon: "🔄", title: "إرجاع سهل وسريع", text: "إرجاع فوري بضغطة واحدة" |
| | `items[3]` | icon: "🛡️", title: "Prime Quality", text: "Verified street gear" | icon: "🛡️", title: "جودة معتمدة", text: "منتجات شارع أصلية ومضمونة" |

---

### Phase 3: Default Section Content & Imagery Generation
1. In `src/lib/store-config.ts` (`createDefaultSection`), update the factory logic to conditionally apply the streetwear-cyberpunk translations if selected.
2. **Generate and Save Visual Assets**:
   Use image generation prompts or design tools to produce 5 optimized, theme-appropriate visual assets. Save them directly into the `public/` directory of the storefront:
   - **`/hero-streetwear-optimized.jpg`**: A high-contrast urban landscape with neon glow, featuring edgy models wearing techwear/streetwear.
   - **`/about-streetwear-optimized.jpg`**: A close-up shot of brutalist-inspired concrete textures with neon pink and green laser lighting.
   - **`/lookbook-1-optimized.jpg`** (or `/lookbook-streetwear-1.jpg`): Dark, moody streetwear model standing in a neon rain-soaked alley.
   - **`/lookbook-2-optimized.jpg`** (or `/lookbook-streetwear-2.jpg`): Graphic close-up of chunky sneakers or tactical boots on a concrete pedestal.
   - **`/lookbook-3-optimized.jpg`** (or `/lookbook-streetwear-3.jpg`): Abstract techwear jacket silhouette with digital glitch overlays.
3. Map these newly generated image URLs as the default fallbacks for the streetwear style in configuration code.

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