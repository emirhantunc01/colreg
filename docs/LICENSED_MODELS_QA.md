# Licensed ship integration — 24 October 2026

The user resumed the paused model stage by supplying both official Sketchfab ZIPs.
This delivery changes asset selection and attribution; source rules, authored tracks,
headings, vessel teaching lengths and signal data remain unchanged. No deployment.

## Asset checks

- Original package hashes recorded; embedded CC BY 4.0 creator notices preserved.
- Tanker creator corrected from the earlier candidate note to package author KoreanNavy.
- Blender inspection confirmed cargo bow +X and tanker bow +Y before normalization.
  Exported bows point -Z in Three.js, with Y-up and centered unit-length hulls.
- Cargo source waterline Z=40 and tanker Z=0 are illustrative visual placements.
  At the existing head-on teaching scales the models remain 110 m and 90 m long.
- Desktop pair: 5,846,020 bytes. Mobile pair: 2,995,752 bytes. Both pass decimal budgets.
- Khronos glTF validator: zero errors in all four derivatives. Three generated-tangent
  warnings per cargo variant; unsupported Meshopt extension/unused UV information
  is recorded in `verification/licensed-gltf-validation.json`.
- Automated tests independently decode Meshopt assets, verify hashes/bounds, reject
  source animations, check actual shipped budgets and verify runtime asset selection.

## Browser checks

Desktop 1440×900, tablet 768×1024 and phone viewport 390×844: both models and cargo PBR textures load;
waterlines, heading direction and wake placement align. The head-on player starts
paused at zero. Play/pause, restart, seeking to 65 s, overhead and free cameras work.
The phone intro's opening, turn and outcome frames retain both ships without text
collision. Model credits expose both creators, source links, license and modifications.
Document widths 1430, 758 and 380 px show no horizontal overflow in those viewports.

Evidence is under `docs/verification/licensed-*.png`. Existing `encounter-led-*`
screenshots remain the evidence for unchanged Lights & Shapes, Signals and Rules.

Development frame-loop readings in this in-app browser were approximately 162–164 FPS,
25 draw calls / 286k triangles for desktop and 21–25 calls / 260k triangles for the
phone viewport, at DPR≈1. These are measurements on this computer, not physical-phone
performance claims. Mobile textures use a lower quality setting; physical device FPS
and the earlier forced reduced-motion/WebGL-failure browser cases remain unverified.

## Automated delivery

- 116 tests passed in 23 files.
- TypeScript and production build passed. Non-fatal Zod annotation and large-chunk
  warnings remain in the build.
- Pre-redesign source snapshot: 40 files checked, zero hash changes.
- `git diff --check` passed. Work remains local; server is on 127.0.0.1:5173.
