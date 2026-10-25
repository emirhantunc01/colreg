# COLREG 3D

English maritime learning application for watching authored encounters and understanding source rules, navigation lights, day shapes and signals. Learners select examples and change perspective; they do not control vessels.

## Product truth
- 38 existing encounters: 36 source-linked educational examples and two technical demos.
- 41 rules, four annexes and original Turkish PDF source preserved separately from English learning explanations.
- Two licensed merchant-vessel replacements with desktop/mobile variants; other legacy GLBs and the procedural recognition vessel remain available. Conditional signal data stays independent of decorative model details.
- Distances, timing, model dimensions and simplified movement remain illustrative, not an operational navigation engine.
- React, TypeScript, Vite, GSAP and Three.js WebGL. Static hosting; no account, backend, payments or exam.

## Main jobs
1. Find a relevant encounter by its actual route preview and conditions.
2. Watch, pause, seek and compare overhead/bridge perspectives with explanatory steps.
   Dashed planned routes are visible by default and show the remaining authored path;
   Scene settings can hide them independently of past movement tracks.
3. Select a vessel condition, change observer direction, and understand visible lights or day shapes.
4. Play a sound/light sequence and inspect its source.
5. Read rules and open the exact source page or related encounter.

## Current redesign brief
Encounter-led cinematic opening using the actual head-on scenario, with open, light learning workspaces. Preserve source content, the ship mark and deterministic vessel tracks. The guided-recognition flow is condition → viewpoint → explanation.

The encounter collection and selected player have separate addresses. All four sections share normal page navigation; selected encounters, profiles, signals and rules belong in the URL so browser history remains useful. Existing `#studio` links open the head-on player.

The model stage resumed on 24 October 2026 with user-supplied licensed cargo and tanker packages. Their web derivatives replace the corresponding legacy assets without changing teaching lengths or tracks. Source packages stay local, optimized derivatives carry visible attribution, and model loading failures retain the standard vessel. No live deployment or access change in this task.
