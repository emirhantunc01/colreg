# Project status — 24 October 2026

## Product decisions
- English static React/TypeScript/Three.js application, authored playback rather than user-controlled vessel navigation.
- The supplied 25-page Turkish COLREG PDF is preserved byte-for-byte. All 41 rules and four annexes are indexed as 407 source segments.
- English explanations are project-authored learning aids. Source clauses and original page layouts remain accessible; animation distances, speeds, headings and times are illustrative.
- Content is available without an expert-approval gate. `reviewed` remains reserved for a documented review and is not assigned automatically.
- No deployment or audience change in this task. Current changes are local on feat/colreg-content.

## Implemented
- Searchable Rules library, section filters, related rules, source page links, Turkish clauses and lazy page previews.
- 36 source-linked educational encounters and two preserved technical demos. Default opening encounter: head-on.
- Actual give-way alterations, head-on starboard turns, crossing astern, overtaking, sailing encounters, Rule 17 stages and Rule 18 status distinctions.
- Channel, obscured L-shaped bend, traffic lanes, wind and restricted-visibility geography; relative-position diagram and timeline annotations/signals.
- Lights & Shapes lab: observer-dependent sectors, day/night, 3D day shapes, operational states, tow/gear thresholds, length choices and camera views.
- Signals lab: Rule 34/35 patterns, deterministic playback and repeats, opt-in synthetic whistle, visual bell/gong sequences, illustrated Annex IV recognition library.
- Annex I placement/intensity/shape references and Annex III frequency/sound pressure tables; exact original technical pages remain available.
- Schema and reference validation, partial-content failure handling, reduced-motion styles, keyboard dialogs and responsive layouts.

## Verification scope
- Automated checks cover source completeness/reconstruction and PDF checksum; scene/model/rule links; deterministic motion and events; continuous closest approach; actual maneuver behaviors; directional sectors; threshold/status combinations and signal timing.
- PDF contact sheets and technical pages 20, 21 and 23 inspected. Literal table layout and formula exponents are preserved in original page previews.
- Desktop, 768-pixel tablet and 390-pixel mobile browser inspections; play/pause, seeking, cameras, rule-to-encounter transition, light profiles and source navigation checked.
- Clause review flags distinguish automatic structure checks from substantive expert/source comparison. They do not certify every authored interpretation or operational maneuver.

## Limits and next work
- Simplified authored tracks; no hydrodynamics, environmental force model, live navigation or collision-risk decision engine.
- Whistle, bell and gong audio is synthesized for recognition and timing; no certified appliance acoustics or audible ranges are simulated. Models and light overlays are recognition aids rather than certified installation drawings.
- Known Ministry/IMO wording differences on Rules 1 and 10 are recorded publicly. Annex III's exact length-boundary wording is explained alongside the table.
- Deploy this reviewed local build only as a separate requested step; preserve the existing hosting audience.

## Cinematic redesign — 23 October 2026
- Implemented shared four-section navigation, cinematic 3D opening, light studio and readable Rules workspace. Design decisions are in PRODUCT.md and DESIGN.md.
- All 38 encounter previews are generated from real scenario tracks and matching channel/bend/TSS geography; hover/focus animation is confined to the active SVG card.
- Recognition now offers explicit night/day modes, four cardinal viewpoints, free orbit and reset. Profile/settings updates preserve the renderer and camera; profile changes clear incompatible condition options. Steady lights have no flash player.
- Signals keeps its meaning and transport together; technical material is collapsed. Audio remains opt-in and stops on pause/seek/switch.
- Browser inspection covered desktop, 768px tablet and 390px mobile during implementation. Images are saved under docs/verification/redesign-*.png. Fixed mobile navigation containing-block, scene framing, clipped camera controls, story overlap and recognition horizontal overflow.
- 91 automated tests pass. Local delivery only; no deployment performed.

## Encounter-led replacement — 23 October 2026
- Replaced the previous library/scene/card shell with a category collection, dedicated large player and narration below the scene. Shared normal-page navigation now carries encounter, profile, signal and rule IDs in the URL.
- Intro uses the authored head-on tracks; desktop and phone framing have pure projection checks. The sea, daylight and deterministic curved wakes are shared with the player; sustained low FPS lowers render resolution.
- Replaced Lights & Shapes and Signals layouts. Recognition status controls remain visible, technical details are collapsed, camera persists through profile changes, and Signals no longer renders a ship.
- Rules has a sticky index, readable article column and related/source rail. Back/forward no longer leaves a stale rule selected.
- Browser evidence for this replacement uses docs/verification/encounter-led-*.png, covering 1440, 768 and 390 px layouts. Verification details and explicit remaining limits are in docs/ENCOUNTER_REDESIGN_QA.md.
- New model acquisition remains paused at the user's request. Existing ships are temporary assets; no new realistic model or licensing claim is made. Physical mobile FPS and forced browser graphics-failure tests remain unverified.
- Changes remain local. Preserve this checkout and branch; no integration/deployment decision is needed for the agreed local delivery.
- Final replacement verification: 109 tests passed in 21 files; TypeScript passed; production build succeeded; tracked diff whitespace check passed; 40 pre-redesign source hashes matched (0 changes).

## Licensed model integration — 24 October 2026
- Model stage resumed with the user's cargo/tanker ZIPs. CC BY 4.0 package notices, source hashes and the tanker creator correction are recorded in docs/ASSET_PROVENANCE.md.
- Blender-normalized merchant vessels replace the corresponding legacy paths in the opening and encounters. Authored lengths, poses and timing are unchanged. Separate desktop/mobile Meshopt/WebP GLBs are cached and cloned with independent disposable render resources.
- Desktop pair 5,846,020 bytes; mobile pair 2,995,752 bytes. All four pass zero-error glTF validation and decoded-bounds/hash/animation checks. Original archives and Blender sources remain local outside public/.
- Visible credits are available in opening/workspace footers. Browser inspection confirms both models, materials, waterlines and heading direction on desktop and phone viewports; play/pause, restart, seeking and cameras were exercised.
- Latest verification: 116 tests in 23 files, TypeScript and production build passed; 40 source hashes unchanged. Evidence and remaining physical-device/fault-case limitations: docs/LICENSED_MODELS_QA.md.
- No deploy, push or access change. Local Vite server remains on port 5173.

## Planned encounter routes — 24 October 2026
- Encounters show each vessel's remaining authored route as a colored dashed line, enabled by default. Scene settings exposes Planned routes independently of historical Movement tracks.
- Seeking reconstructs the line from the current position through the exact future track points; stationary duplicates are omitted and lines disappear at arrival. Fixed GPU buffers are reused during playback.
- 119 tests in 24 files, TypeScript and production build pass. Browser checks cover visible routes, toggle off/on, end-of-track removal and rewind restoration.
