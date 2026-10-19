# Interface direction — 2026-10-19

Design guidance: Anthropic frontend-design, discovered through find-skills and reviewed from its official source. Reference: https://github.com/anthropics/skills/tree/main/skills/frontend-design.

Palette: workspace #f2f5f6, surface #ffffff, text #202e37, secondary #64747e, action #2359bd, player #102b3b. IBM Plex Sans for a consistent technical reading voice. Existing vessel colors remain meaningful scene identifiers.

Layout: quiet encounter navigation on the left; large dark scene and transport beside a white observation panel; vessel and overlay controls below. On tablets, narrative follows the player; narrow screens move navigation above it.

Removed decorative thumbnails, repeated breadcrumbs, uppercase eyebrows, prototype badges and marketing-style filler. The technical-demo disclaimer and source assumptions remain visible. Controls retain their behavior and English labels.

Verified: production build, 13 engine/content tests, browser scenario selection, playback, step navigation, overhead camera, source modal, tablet and narrow viewport. No horizontal overflow at 390px.
