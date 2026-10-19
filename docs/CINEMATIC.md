# Cinematic opening — 2026-10-19

Motion guidance: official GreenSock gsap-core, gsap-scrolltrigger, gsap-react and gsap-performance skills, discovered with find-skills. Reference: https://github.com/greensock/gsap-skills.

- Full-height real-time ocean and cargo vessel with procedural textures; no external image/model downloads.
- Three scroll chapters drive a deterministic camera path and coordinated typography via GSAP ScrollTrigger. Native scrolling is preserved; no wheel/touch interception.
- Open studio / Explore encounters / final Enter studio controls can enter the workspace. #studio opens directly; Replay opening restores the cinematic introduction.
- Opacity/transform-based text and workspace transitions. Ambient water/ship motion can be paused. Prefers-reduced-motion bypasses text/camera scroll choreography and displays a static composition with the studio button available.
- GSAP matchMedia is scoped to the intro and reverted on unmount. Frame loops, observers, geometries, materials and textures are cleaned up; rendering skips hidden/offscreen views and stops on graphics context loss.
- The opening is illustrative, not a collision-avoidance lesson. Educational demos retain their source-status disclaimers.

Verified: 15 tests (camera endpoint/clamping/replay plus existing engine/content checks), TypeScript and production build; desktop opening, scroll chapters, entry, replay, pause, 390px responsive layout. Reduced-motion lifecycle was reviewed in code; an OS-level preference switch and physical low-end devices were not tested.

Tradeoff: the initial JS bundle is approximately 313 kB gzip; Vite reports a non-blocking chunk-size warning. The vessel is procedural; a custom optimized Blender model can improve realism later without changing the interaction design.
