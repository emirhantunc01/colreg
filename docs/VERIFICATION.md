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

## Source integration checks — 22 October 2026

- Full Vitest suite: 80 tests across 13 files.
- TypeScript check and production build pass. Existing Zod annotation and >500 kB primary-bundle warnings remain non-blocking; the two new learning workspaces are separate lazy chunks.
- Python extraction test passes using the preserved source PDF. All 45 records and 407 segments have unique IDs, page provenance and reconstruction checks. PDF checksum matches the supplied bytes.
- Every indexed scenario/model/rule resolves. Every educational vessel pair passes continuous-time closest-approach clearance checks over union keyframe intervals.
- Browser checks: 1280 desktop, 768 tablet and 390 mobile; no horizontal document overflow in the two measured small-screen cases. Rule search, source-rule navigation, rule-to-encounter transition, actual step seeking, overhead camera, day shapes, signal play/pause/mute and keyboard End seeking inspected.
- Original PDF contact sheets and full technical pages 20, 21, 23 inspected. The original page previews retain typography, formulas and tables independently of text extraction.
- Screenshots are in docs/verification. Browser checks used http://127.0.0.1:5174/#studio.
- No live navigation, engineering/acoustic certification, full legal equivalence review or documented expert approval is claimed. This task does not deploy.

## Cinematic redesign — 23 October 2026
- 91 tests across 15 files pass, including real preview projection/geography and recognition viewpoint/day-shape/default-state checks.
- Browser checks confirmed bow/starboard/stern/port readouts, camera preservation through day/profile changes, steady versus flashing controls, opt-in signal sound and pause, encounter search/selection and playback/step/restart.
- Desktop, 768px tablet and 390px mobile were inspected; screenshots use the redesign- prefix. Measurements confirmed no document horizontal overflow in measured tablet/mobile layouts; recognition content overflow was corrected.
- Original source rules and authored maneuver tracks were not edited for this redesign. No claim of expert COLREG validation is added.
