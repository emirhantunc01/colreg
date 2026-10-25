# Scenario authoring

## Add an encounter

1. Copy an existing JSON in `public/scenarios/` to a new lowercase-hyphenated filename.
2. Give it a matching unique `id`. Add its metadata to `public/scenarios/index.json` (id, file, title, subtitle, duration).
3. Define vessels and complete tracks, narrative steps, sources and assumptions. Run checks, then inspect it in the browser.

The library and individual scenario are fetched separately. A missing or invalid scenario is isolated; other library items remain usable. Use relative asset paths and deploy at the configured Vite base (default root).

## Data contract

- `status`: `technical-demo`, `draft`, or `reviewed`. Only source-checked and expert-reviewed educational material should use `reviewed`; the validator requires at least one source but cannot verify human review.
- `duration`: positive seconds. `summary` and `title`: English text.
- `vessels`: 1–8, unique IDs, name, hex color, length in metres (5–300), optional model path, track.
- Track points: `{ "time": 0, "east": -100, "north": 50, "heading": 0 }`. Times strictly increase from zero to exactly scenario duration. Coordinates are metres in a local flat plane. Headings are degrees clockwise from true north, in [0,360).
- `steps`: increasing time, title and body. First step starts at zero. Times cannot exceed duration. Step text updates at its timestamp; playback does not automatically pause.
- `sources`: objects with `title`, `pages` and optional `figure`, `rule`. Pages should distinguish PDF page index from printed page number when they differ.
- `assumptions`: explicit authoring choices and unresolved limitations. Never present invented timings or positions as book facts.

Positions interpolate linearly. Headings interpolate via the shortest angular distance; add intermediate points for turns greater than 180 degrees. Exactly 180 degrees takes the decreasing-heading direction. This is authored visualization, not a hydrodynamic vessel model. The clock is independent of rendering: seeking to a time produces the same pose regardless of playback history.

## Blender replacement models

Put a GLB in `public/models/`, set a vessel's `model` to `models/your-vessel.glb`. Export with applied transforms, Y up in glTF, bow toward local -Z, beam along X. The loader scales Z extent to the declared vessel length, centers X/Z and places the lowest model point at water level. Use a hull-only export: do not include ocean/cameras or unnecessary distant geometry. Built-in procedural geometry remains a fallback for failed model loads. Baked model animation clips are not played by v1; navigation motion comes exclusively from JSON.

Check model licensing, physical dimensions, waterline, orientation, camera clearance and performance. Bridge eye height is 24% of vessel length in this prototype, not a verified bridge specification.

## Book-to-animation workflow

Keep the original PDF in `content/sources/` and update `content/index.csv`. Extract one complete encounter (text plus figure and continuation pages) at a time. Record the exact source, vessel conditions, responsibilities, manoeuvre sequence, open questions and invented animation parameters in `content/scenario-notes/<id>.md`.

Process stages: pending → extracted → source-checked → expert-reviewed → implemented. Compare the extraction directly against original pages; do not repeatedly summarize summaries. A maritime reviewer must confirm applicability, timing narrative and all relevant exceptions before an educational scenario is marked reviewed. PDF extraction is an authoring workflow outside the application.

## Acceptance for a new encounter

Validate JSON, inspect beginning/turn/end in all three cameras, seek backwards, verify labels and steps, check source references and assumptions. Use a geometry-consistent route; heading interpolation alone does not make a physically realistic turn.

## Source-linked learning edition (22 October 2026)

- `public/content/rules.json`: complete source record index; load only when Rules is opened.
- `public/content/colreg-source.pdf`: unchanged source; `content/raw-pages.json` retains extraction per page.
- `scripts/extract_colreg.py`: rebuild text and initial source coverage; requires pypdf.
- `scripts/render_source_pages.py`: rebuild 25 lazy WebP page previews; requires pypdfium2 and Pillow.
- `scripts/generate_encounters.mjs`: reproducibly rebuild the 36 educational encounters, preserving the two technical demos.
- `python scripts/test_extract_colreg.py`: validate extraction, source reconstruction and copied PDF checksum. The test uses the preserved repository PDF, not a developer-specific Desktop path.
- `npm test`, `npm run typecheck`, `npm run build`: validate data contracts, cross-links, movement, sector/state/threshold behavior, timing, TypeScript and the production bundle.

Scenario additions: `ruleIds` uses `rule-N` identifiers, also in the library entry; `conditions` lists explicit applicable facts; `environment` contains `kind` (open/channel/bend/tss), `visibility` (clear/restricted), optional `windFrom` degrees true. `events` contains time, duration, type (annotation/sound/light), text, optional vesselId and alternating on/off `pattern` durations beginning with on. All events must finish within the scene. Sound is opt-in and stops on pause, seek, scene switch or hiding the tab.

Existing scenarios default to no rule links/events and clear open water. Do not infer vessel status from a model: identify it in `kind` and the scene conditions. Add sufficiently dense position/heading samples through a turn and validate the whole continuous closest approach, not only isolated frames.

Educational content may be displayed as source-based learning without waiting for expert approval. The `reviewed` status is optional and still requires a real documented review. Never mark every clause source-compared or substantively tested merely because a parser or structure test passes.

GLB exports keep the authored waterline at Y=0; loading preserves Y and centers X/Z. Bridge height and aft offset can be explicitly supplied. These are illustrative camera assumptions unless tied to verified particulars.

## Encounter chart previews
Run `node scripts/generate_previews.mjs` after editing scenario routes. `npm run dev` and `npm run build` also regenerate these previews. The index stores projected timed tracks, conditions, stages and the matching channel/TSS geography; cards never invent alternate routes or start their own WebGL renderer. Search filters stable scenario IDs without changing their preview data.

## Interface design
`PRODUCT.md` records product scope and `DESIGN.md` records visual and interaction decisions. Shared typography, surface colours and focus styles live in `src/design-system.css`. Educational colours and rule/timing data remain in the training and scenario data modules.
