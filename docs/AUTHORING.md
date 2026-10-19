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
