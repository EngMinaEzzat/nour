# Fashion Store - Customer Flow Inclusive Visuals & Representation Plan (Inclusive Visuals Specialist)

Establish visual prompt architectures, negative constraints, and a cultural validation checklist for generating lifestyle images on the storefront. This plan ensures that AI-generated imagery represents Egyptian shoppers with dignity, agency, and authentic contextual realism (modesty styles, natural lighting, local architecture) while avoiding cloned faces, gibberish symbols, and generic Western stock-photo defaults.

---

## User Context & Inputs
- **Scenery Anchors**: Approved to standardize default prompts to anchor visual backgrounds in recognizable, premium Egyptian settings (such as Zamalek, Heliopolis, Maadi, Alexandria).
- **Store Builder Helper**: Approved to integrate a copy-pasteable prompt template widget directly in the merchant's `store-builder.tsx` interface.
- **Realism Priority**: Focus primarily on cultural, skin-tone, and modesty attire realism first before expanding to other demographic markers (varied age groups and body shapes).
- **Dimensions**: Provide prompt layouts supporting flexible aspect ratios (16:9 landscape, 1:1 square, and 4:5 vertical).

---

## Proposed Changes

### Creative Guidelines & Prompt Framework

Establish the core prompt architectures and guidelines to assist storefront operations.

#### [NEW] [inclusive-visuals-guide.md](file:///c:/proj/nour/docs/UX-audit/inclusive-visuals-guide.md)
- **Egyptian Fashion Prompt Architecture**: Create structured recipes breaking down:
  - **Subject & Attire**: Detailed descriptions of modest fashion, hijabs (draping naturally, non-exaggerated), diverse hair types (4C, curls, waves), and accurate skin tones.
  - **Environment**: Heliopolis, Maadi, Alexandria, Zamalek streetscapes with realistic lighting.
  - **Negative library**: Explicit exclusions to block clone faces, extra fingers, gibberish Arabic text, and hyper-saturated lighting.
- **7-Point Post-Generation Checklist**: A review gate checking sociological accuracy, lighting authenticity, and physical rendering errors (mobility aids, hijab physics).

---

### Store Builder AI Integration

Provide prompts directly to merchants during storefront construction.

#### [MODIFY] [store-builder.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/pages/store-builder.tsx)
- **Inclusive Prompt Helper Overlay**: Integrate a panel or helper widget displaying pre-formulated, localized visual prompt templates. This guides merchants to generate respectful, high-quality banner images via third-party AI image generators.
- **Warning Tooltips**: Add visual warnings advising merchants to avoid generating text, logos, or flags directly inside their AI images to prevent gibberish outputs.

---

## Verification Plan

### Automated Tests
- Ensure compilation finishes successfully and no syntax warnings arise:
  ```powershell
  npm run build
  ```

### Manual Verification
- Walk through the store builder interface to confirm the Inclusive Prompt Helper is easy to access and that its text strings copy correctly to the clipboard.
- Verify that templates generated from the guide render high-quality, authentic representations when run through standard image models.
