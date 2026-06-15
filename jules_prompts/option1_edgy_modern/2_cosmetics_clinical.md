📋 **The Prompt to feed into Jules:**

You are an expert Senior Frontend Engineer and UX/UI Designer. Your goal is to introduce a completely new visual theme for our `cosmetics` store category.

The new theme must be **"clinical-derma"**. It should look completely different from the current default options, bringing an ultra-clean, sterile, science-backed aesthetic with brand-new default imagery, tone, and localized copy.

You must implement this without breaking the existing styles and while adhering strictly to the project's accessibility and security guardrails.

---

### Phase 1: Design System & Configuration (StitchMCP)
1. **Initialize/Register the Design System**: Use the `StitchMCP` tool (`create_design_system`) to register a new design system with the following tokens:
   - **Colors**:
     - Primary: `#008080` (Clinical Teal) or `#00a8a8` (Clinical Cyan)
     - Secondary: `#ffffff` (Pure Sterile White)
     - Main Background: `#f8fafc` (Slate Ice Light)
     - Section Background: `#ffffff`
     - Card Background: `#ffffff`
     - Border Color: `#e2e8f0`
     - Text Heading: `#0f172a` (Slate Dark)
     - Text Body: `#475569`
   - **Typography**: Clean, highly legible sans-serif font pairing (e.g., `system-ui, -apple-system, sans-serif` for both headings and body).
   - **Border Radii & Buttons**: Smooth, rounded button style (`8px` border-radius) and soft card corners (`12px` border-radius).
2. **Codebase Integration**:
   - In `src/lib/store-config.ts`, expand the `StyleType` union to include `"clinical-derma"`.
   - Expand the `PersonalityType` union to include `"clinical"`.
   - Add the `"clinical"` personality configuration to the `PERSONALITY_PRESETS` object utilizing the colors, fonts, and border-radii defined above.
   - Add `"clinical-derma"` to the `STYLE_PRESETS` object, specifying the optimal clinical section order: `Hero`, `Trust Strip`, `Categories`, `New Arrivals`, `Best Sellers`, `Offers`, `Lookbook`, `Instagram (UGC)`, `Newsletter`, `About`, `WhatsApp`.

---

### Phase 2: Complete i18n Localization (English & Arabic)
1. Edit `src/locales/en/translation.json` and `src/locales/ar/translation.json`.
2. Add the following highly distinct localized default copies under the key `defaultSections.clinicalDerma`:

| Section | Field | English Translation | Arabic Translation |
|---|---|---|---|
| **Hero** | `heading` | "Science-Backed Dermaceuticals by {{storeName}}" | "عناية بالبشرة مدعومة بالعلم مع {{storeName}}" |
| | `subheading` | "Active formulas & dermatologist approved results" | "تركيبات نشطة ونتائج معتمدة من أطباء الجلدية" |
| | `ctaText` | "Consult the Expert" | "استشيري الخبراء" |
| **About** | `heading` | "The Science of {{storeName}}" | "علم الجمال مع {{storeName}}" |
| | `body` | "Formulated by dermatologists, tested in clinical labs. We bring you active ingredients that deliver proven results. No fillers, just science." | "مُركب بأيدي أطباء الجلدية ومختبر في المعامل الطبية. نقدم لكِ مكونات نشطة تمنحكِ نتائج حقيقية مثبتة. بلا إضافات، العلم والفعالية فقط." |
| **Lookbook** | `heading` | "Clinical Trials - Skin Barrier" | "المجموعة الطبية - حاجز البشرة" |
| | `items[0].title` | "Active\n Formula" | "التركيبة\n الفعالة" |
| | `items[0].desc` | "Deep cellular repair." | "إصلاح عميق للخلايا." |
| | `items[1].title` | "Clinical\n Trials" | "تجارب\n سريرية" |
| | `items[1].desc` | "Dermatologist approved results." | "نتائج معتمدة من الأطباء." |
| | `items[2].title` | "Skin\n Barrier" | "حاجز\n البشرة" |
| | `items[2].desc` | "Strengthen and protect daily." | "تقوية وحماية يومية للبشرة." |
| **Trust Strip**| `items[0]` | icon: "🔬", title: "Lab Tested", text: "Dermatologically certified" | icon: "🔬", title: "مختبر معملياً", text: "معتمد من أطباء الجلدية" |
| | `items[1]` | icon: "🧪", title: "Pure Actives", text: "Clinically proven ingredients" | icon: "🧪", title: "مكونات نقية", text: "تركيبات مثبتة سريرياً" |
| | `items[2]` | icon: "🏥", title: "Medical Grade", text: "Safe for sensitive skin" | icon: "🏥", title: "درجة طبية", text: "آمن للبشرة الحساسة" |
| | `items[3]` | icon: "📦", title: "Sterile Shipping", text: "Clean sealed packaging" | icon: "📦", title: "شحن معقم", text: "تغليف مغلق ومعقم" |

---

### Phase 3: Default Section Content & Imagery Generation
1. In `src/lib/store-config.ts` (`createDefaultSection`), update the factory logic to conditionally apply the clinical-derma translations if selected.
2. **Generate and Save Visual Assets**:
   Use stitch for image generation to produce 5 optimized, theme-appropriate visual assets. Save them directly into the `public/` directory of the storefront:
   - **`/hero-clinical-optimized.jpg`**: A minimalist, high-key studio photograph showing premium cosmetic bottles next to botanical glass test tubes on a clean slate background.
   - **`/about-clinical-optimized.jpg`**: A clean, close-up shot of cosmetic serum drops or light blue gel textures with water droplets.
   - **`/lookbook-1-clinical-optimized.jpg`**: Minimalist product layout featuring dropper bottles and clear gel textures in a clean lab setting.
   - **`/lookbook-2-clinical-optimized.jpg`**: A close-up of skin barrier layers graphic or molecular structural design in soft blue/white light.
   - **`/lookbook-3-clinical-optimized.jpg`**: Clean cosmetics jar resting on a marble slab surrounded by clear, clean water ripples.
3. Map these newly generated image URLs as the default fallbacks for the clinical style in configuration code.

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