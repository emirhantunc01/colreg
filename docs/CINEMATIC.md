# Opening and studio motion — 2026-10-19

Guidance: official GreenSock GSAP skills and Emil Kowalski's emil-design-eng, discovered with find-skills. References: https://github.com/greensock/gsap-skills and https://github.com/emilkowalski/skills.

## Photograph opening

A real photograph by Bent Van Aeken replaces the procedural opening vessel and ocean. Responsive AVIF images (desktop 378,238 bytes / mobile 231,845 bytes) use WebP fallbacks. The picture element fetches only the chosen format/size. Assets are self-hosted; there is no image-generation service or runtime Unsplash API call. See ASSETS.md for original and licensing.

GSAP coordinates photographic pan/zoom and three text chapters with native scrolling. CSS adds a slow, pausable drift. Reduced motion gives a static opening. The root URL shows the intro; #studio opens the player directly. Replay opening returns to it. If the image cannot load, a plain ocean-color fallback leaves the text and entry buttons usable.

The opening no longer creates a WebGL renderer or continuously runs a JavaScript rendering loop. The interactive studio still uses Three.js because photographs cannot represent arbitrary viewpoints and scenario movement.

## Studio motion

CameraFlight interpolates position and orientation over 500ms with a cubic ease-out. A new camera request starts from the currently displayed pose, so rapid changes do not jump back. The bridge goal continues following the vessel during the transition. Keyboard camera changes, initial framing and reduced motion snap directly.

Auto orbit is optional, off by default, resets on scenario changes and stops when another view is selected. It uses delta-time-based OrbitControls rotation and is disabled for reduced motion. It does not advance scenario time.

A sliding camera selector, press feedback, short observation transitions and source-dialog entry feedback indicate user actions. Timeline scrubbing and numeric values remain immediate. Keyboard actions bypass decorative movement. Existing content stays on-screen during loading; new data replaces it only after validation.

## Verification

16 tests cover deterministic encounter motion, content/library validation and camera endpoint/orientation/retarget/instant behavior. TypeScript, production build and browser checks are recorded in VERIFICATION.md. Physical low-end devices and an OS-level reduced-motion preference switch have not been exercised.
