# Project status — 2026-10-19

## Decisions

- English web application; guided authored animation, no free vessel control.
- React + TypeScript + Vite + Three.js, local static delivery, no backend.
- Two synthetic examples until the book arrives. No COLREG duties or recommendations assigned.
- Scenario and source data live in files, outside conversation memory.
- Source-derived content requires direct page comparison and maritime expert review.

## Implemented

- Scenario library and isolated JSON loading/validation.
- Deterministic timeline, transport controls, steps, cameras, selectable vessels and overlays.
- Procedural vessels, optional GLB replacement and WebGL fallback.
- Source notes, responsive layout and authoring documentation.

## Next

1. Receive the book PDF and bibliographic details.
2. Index encounters and extract one complete scenario with figures.
3. Confirm interpretation and assumptions with the maritime reviewer.
4. Author the first reviewed scenario and inspect it against the original.
5. Review visual quality with users before adding complex models or expanding scope.

## Deliberate limits

No vessel dynamics, collision adjudication, live navigation, AI decisions, online publishing or PDF ingestion UI. Demo timing, dimensions and camera heights are illustrative. 3D controls are drag/scroll in Free view; Bridge and Overhead are fixed cameras.
