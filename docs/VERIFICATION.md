# Verification — 2026-10-19

- `npm test`: 13 tests passed. Covers clamped endpoints, midpoint interpolation, both north-crossing directions, rewind determinism, playback speed/end, coordinate conversion, shipped scenarios and invalid scenario/library data.
- `npm run typecheck`: passed.
- `npm run build`: passed. Non-blocking upstream Zod annotation warnings and a large Three.js bundle warning remain (about 264 kB gzip for JavaScript).
- Production dependency audit: no known vulnerabilities at verification time.
- Browser checks: free/overhead/selected-vessel bridge cameras; narrative step jumps; play/pause; playback speed; end auto-stop; replay; scenario reset; labels/tracks; source panel and Escape; isolated invalid-scenario error and switching back to healthy content.
- Tablet 768×1024 and narrow 390×844 layouts inspected. Narrow layout had no document horizontal overflow.
- Console error log was empty during normal use.
- Optional user-supplied GLB and actual unsupported-WebGL hardware have not been exercised; fallback paths are implemented. No source-based educational content can be verified until the PDF arrives.
- Independent read-only code review found no critical runtime issues. Index validation was tightened after review. Reviewed status is an author-maintained editorial designation, not automatic certification.
