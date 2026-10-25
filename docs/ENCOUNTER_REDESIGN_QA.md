# Encounter-led redesign verification — 23 October 2026

Update 24 October: the previously paused licensed-model stage is now implemented.
See [licensed model QA](LICENSED_MODELS_QA.md) for current assets, size budgets,
browser images and the latest 116-test result. The historical results below describe
the earlier temporary-model pass.

Local delivery on `feat/colreg-content`. The supplied source, authored tracks, vessel lengths and training data are preserved. No deploy, push, account/access change or new model acquisition was performed.

## Implemented and inspected

- Intro: the authored Rule 14 encounter, deterministic scroll-to-time mapping, separate desktop/phone camera paths, right/left/center copy, always-available studio entry and accurate track-based fallback.
- Encounters: open category rows with real track previews and condition captions, a separate full-width player, controls and narration below the sea, and optional training layers.
- Lights & Shapes: searchable condition picker, large scene beside a bearing-dependent explanation, external viewpoint/day-night controls, visible operational switches and collapsed technical detail.
- Signals: no background ship; one meaning, actual-duration rhythm bars, repeat intervals, playhead and opt-in synthesized audio.
- Rules: normal reading page, sticky index, bounded article measure and related/source rail. Selected content is in the URL; legacy `#studio` still opens the head-on lesson.
- GSAP transitions are scoped and cleaned up. Reduced-motion branches avoid decorative transitions. Vessel/sample timing and signal timing remain independent of decorative animation.

## Browser evidence

Current screenshots are named `docs/verification/encounter-led-*.png`. The older `redesign-*.png` files are retained as comparison evidence from the preceding layout.

All four workspaces were inspected at 1440×900, 768×1024 and 390×844. Their document widths were respectively 1430, 758 and 380 pixels, with no horizontal overflow. A long recognition-profile select caused overflow during the pass; min-width constraints were corrected.

Checked interactions:
- Encounter search including no results, clear search, stable selected encounter and category rows.
- Intro entry opens head-on paused at zero. Seeking to an authored step, seeking to 90 s, restart and camera presets.
- Source dialog contains original conditions and assumptions; rule link opens Rule 14, and its related scene returns to the player.
- Rules selection and browser back restore matching content and URL.
- Bow shows masthead plus both sidelights; starboard shows masthead plus green; stern shows sternlight; port shows masthead plus red for the selected 49 m power-driven profile.
- Day mode explains the absence of a special day shape. Profile changes preserve the selected viewpoint; incompatible operational options reset. NUC making-way toggle and flashing purse-seine profile checked.
- Signal selection pauses and resets time; Signals contains no canvas. Opt-in audio, start and selection-stop checked. Default route selection resolves consistently on back navigation.
- Skip link focuses workspace content without changing the route. Source dialog uses native dialog focus behavior.

## Automated checks

The final test/build result is recorded in PROJECT_STATUS.md. Coverage includes actual-scenario intro camera projections, player camera bounds at landscape/portrait aspects, scroll timing, deterministic motion, heading wrap, preview identity/geometry, conditional light sectors, threshold/status data, signal timing and adaptive resolution. All 40 files captured in the pre-redesign source snapshot matched their SHA-256 hashes after the UI work.

## Performance and delivery limits

Development renderer readings in the desktop in-app browser showed approximately 152 FPS for the intro and 165 FPS for the player at DPR ≈1, with 23–27 draw calls and about 71,000 triangles. These are this environment's frame-loop measurements, not a certification for physical phones or other GPUs. Adaptive DPR lowers buffer resolution after sustained missed frame budgets and stops sampling while hidden/offscreen.

Existing paired GLBs total 3,123,376 raw bytes (about 3.12 MB / 2.98 MiB). No new mobile asset variant was produced because the user paused the model stage. The realistic replacement models and their final license/optimization review remain pending. The current procedural/model silhouettes must not be described as that delivery.

Reduced-motion branches and graphics-failure recovery are implemented and reviewed in code; this browser tool did not expose media emulation or safe WebGL-context fault injection, so those browser fault cases were not forced. A physical tablet/phone performance check remains necessary before making device-wide FPS claims.

The build may report dependency annotation warnings and a large main chunk warning; they are non-fatal. Rules and Training Lab are lazy chunks. Heavy postprocessing is not used.

Final automated run: **109/109 tests (21 files)**, TypeScript and production build passed. `git diff --check` passed. Source snapshot: **40 checked, 0 changed**.
