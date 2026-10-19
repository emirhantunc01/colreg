# Verification — 2026-10-19

- `npm test`: 16 tests passed. Covers scenario motion, both north-crossing directions, rewind determinism, speed/end, coordinate conversion, content/library validation and camera endpoint/orientation/retarget/instant behavior.
- `npm run typecheck`: passed.
- `npm run build`: passed; non-blocking upstream Zod annotation warnings and a Three.js bundle-size warning remain.
- Browser: real photo loaded as desktop AVIF (1600×1000) and mobile AVIF (800×1100); image selected with picture sources and photographer attribution visible.
- Studio: rapid camera retargeting, keyboard instant mode, optional Auto orbit movement, automatic orbit reset on a different view, scenario switching and observation steps verified. Pointer input restores normal motion after keyboard interaction.
- Narrow 390×844 viewport inspected; document content did not overflow horizontally.
- Earlier regression checks: play/pause, timeline seek, source notes and Escape, bad-content isolation, selected-vessel bridge and overlays.
- Independent read-only review found no substantive lifecycle/loading/camera errors. Context-loss rendering loop now stops.
- Actual low-end hardware, an OS-level reduced-motion toggle and third-party GLB imports have not been exercised. Source-based instruction awaits the book and maritime review.
## Studio visual refresh — 2026-10-19

The studio now uses deep maritime surfaces, mint controls, animated route thumbnails, staggered panel entrances, selected-state feedback and animated observation changes. Layout remains responsive; reduced-motion disables decorative animations. Existing deterministic playback and camera transitions are preserved.

Design references: skills.sh/leonxlnx/taste-skill/redesign-existing-projects (published audit checklist) and the task-local emil-design-eng skill. No new runtime dependencies.

Validation: production build and 16 tests pass. Desktop 1440px and mobile 390px inspected in browser; scenario selection, next step and responsive player verified. This changes presentation only; demonstrations remain unvalidated technical examples.

## Scene-first UI rebuild — 2026-10-19
Replaced the permanent library/sidebar and lower card row with a viewport scene, tool navigation, an animated library drawer, dismissible story panel and scene-settings popover. Playback is a floating dock. Closed tools are inert and removed from the accessibility tree. Panel dismiss actions return focus to their tools. Desktop camera framing reserves room for the story. Responsive mobile panels remain dismissible; reduced-motion suppresses transitions.
UI/UX Pro Max guidance was read from its official SKILL.md; the published priority rules were used directly (no local database search or installation is claimed).

## Blender vessel integration
- Opening: atlas-container-ship.glb; steady tracks: product tanker / fishing trawler; course change: container ship / sailing yacht.
- GLBs are Y-up, bow -Z; preserve authored waterline at Y=0 and scale by requested hull length. .blend sources are kept separately in the task output directory.
- Scenario bridgeHeight/bridgeAft describe illustrative camera positions in metres, aft positive along local Z. Optional kind labels identify vessel types. Model label elevation follows actual model height.
- A simple vessel remains available when a model fails to load. Asset URLs respect Vite BASE_URL. Late GLTF responses are disposed after scene teardown.
- Automated placement tests cover scaling, waterline, invalid geometry and deployment subdirectories. All 19 tests pass; production build passes.
