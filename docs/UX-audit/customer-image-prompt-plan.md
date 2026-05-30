# Fashion Store - Customer Flow Photography & AI Prompt System Plan (Image Prompt Engineer)

Establish a professional photography prompt library and technical parameter guidelines for AI-generated visuals. This plan translates complex visual goals (fashion editorials, beauty cosmetics closeups) into precise camera styles, lighting setups, and platform-specific code (e.g. Midjourney v6 parameters, Flux tags) to ensure merchants can generate high-end, commercial-grade visual assets.

---

## User Context & Inputs
- **Visual Style Reference**: Contemporary editorial look modeled after modern fashion brands (soft natural lighting, film stock emulation like Kodak Portra 400 or Fujifilm Pro 400H for organic textures, and a shallow depth of field).
- **Color Grading Profile**: Warm, soft pink styling tones, matching the theme palette to maintain visual consistency across all collection images.
- **AI Platform Focus**: Custom prompt helpers optimized for **Midjourney** (using parameter tags like `--ar 4:5 --style raw --v 6.0`) and **Flux** (detailed natural language prompts).
- **Accessory Flat Lays**: Skipped. The guidelines will focus on standard model portraiture and cosmetics bottles.

---

## Proposed Changes

### Dynamic Prompt Architecture & Specifications

Define the technical photography rules and output templates.

#### [NEW] [ai-photography-prompt-library.md](file:///c:/proj/nour/docs/UX-audit/ai-photography-prompt-library.md)
- **Technical Photography Layers**: Document formulas matching actual photographic settings:
  - **Camera & Lens**: 85mm f/1.4 for fashion portraiture (shallow depth of field), 90mm macro for close-up cosmetics texture details.
  - **Lighting Setup**: Softbox diffusion, Rembrandt triangle side lighting, rim/hair highlights to isolate subjects from backdrops.
  - **Post-Processing**: Emulation profiles for analog film (Kodak Portra grain, warm highlights, muted greens).
- **Genre-Specific Templates**: Provide structured fill-in-the-blank prompt blocks for:
  - *Cinematic Fashion Editorial*
  - *Luxury Cosmetics Product Shot*
  - *Natural Lifestyle Lookbook*

---

### Store Builder AI Helper Integration

Inject prompt templates into the store builder interface.

#### [MODIFY] [store-builder.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/pages/store-builder.tsx)
- **Photography Preset Options**: Expand the prompt helper overlay to allow merchants to toggle presets (e.g. "Fashion Editorial" or "Cosmetics Close-up"). Selecting a preset automatically appends technical lens, film stock, and lighting constraints to their prompt.
- **Copy to Clipboard Buttons**: Include simple action buttons to copy formatted prompts directly into tools like Midjourney or Flux.

---

## Verification Plan

### Automated Tests
- Verify that standard TypeScript builds compile successfully:
  ```powershell
  npm run build
  ```

### Manual Verification
- Verify that the layout selectors for photography presets update the output template correctly inside the Store Builder UI.
- Test prompt output templates across targeted engines (Midjourney/Flux) to verify they generate visually consistent, high-fidelity results.
