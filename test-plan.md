1. **Modify `src/lib/store-config.ts` (Phase 1, 3, 4)**:
    * Update `StyleType` union to include `"dark-glamour"`.
    * Update `PersonalityType` union to include `"dark-glam"`.
    * Add `"dark-glam"` to `PERSONALITY_PRESETS`:
        * `label: "دارك جلامور"`, `desc: "لمسة من الغموض والأناقة الفاخرة"`, `emoji: "🖤"`.
        * `colors: ["#1a0000", "#d4af37"]`.
        * `font: "Cormorant Garamond"`.
        * `theme: { primaryColor: "#1a0000", secondaryColor: "#d4af37", fontPairing: "serif-serif", buttonStyle: "square", cardShadow: "none" }`.
    * Add `"dark-glamour"` to `STYLE_PRESETS`:
        * `label: "دارك جلامور"`, `desc: "لمسة من الغموض والأناقة الفاخرة"`, `emoji: "🖤"`.
        * `sections: ["hero", "trust-strip", "new-arrivals", "lookbook", "categories", "about", "newsletter"]`.
    * Update `createDefaultSection` signature to accept `style?: StyleType` as an optional parameter.
    * Update `normalizeHomepageSections` signature to accept `style?: StyleType` as an optional parameter and pass it to `createDefaultSection`.
    * In `createDefaultSection`, check `style === "dark-glamour"`. If true, use keys `"defaultSections.hero.headingDarkGlamour"`, `"defaultSections.hero.subheadingDarkGlamour"`, and set the `hero` fallback `imageUrl` to `"/hero-glamour-optimized.jpg"`. Also adjust `lookbook`, `about`, and `trustStrip` to use their `DarkGlamour` key variants.

2. **Add Translations (Phase 2)**:
    * English (`src/locales/en/translation.json`): Add keys like `headingDarkGlamour` ("Fierce Elegance"), `subheadingDarkGlamour` ("Unveil the Night"), and lookbook/about/trust-strip equivalents.
    * Arabic (`src/locales/ar/translation.json`): Add keys like `headingDarkGlamour` ("جاذبية غامضة"), `subheadingDarkGlamour` ("تألقي بجرأة").

3. **Verify Code Modifications**:
    * Run `read_file` to confirm the edits to `src/lib/store-config.ts`, `src/locales/en/translation.json`, and `src/locales/ar/translation.json` were correctly applied.

4. **Verify & Validate (Phase 5)**:
    * Run `pnpm run typecheck --filter @workspace/fashion-store`.
    * Run `pnpm run test --filter @workspace/fashion-store`.
    * Run `pnpm run build --filter @workspace/fashion-store`.

5. **Run Pre-Commit Checks**:
    * Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
