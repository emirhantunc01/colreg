# Licensed vessel source packages

The user supplied two official Sketchfab downloads on 24 October 2026. Source
ZIPs, extracted originals and Blender working files remain local and are ignored
by Git. Their checksums are recorded in `archives/manifest.json`; licenses and
creator/source links are shipped in `public/models/licensed/`.

Extract `cargo_ship.zip` into `cargo/` and `tanker_ship.zip` into `tanker/` so
each contains `scene.gltf`, `scene.bin`, its license and any textures.

From the project root in PowerShell, with Blender 5.2 installed:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python-exit-code 1 --python scripts/prepare_licensed_models.py -- cargo --normalize --yaw 90 --waterline 40
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python-exit-code 1 --python scripts/prepare_licensed_models.py -- tanker --normalize --yaw 0 --waterline 0
node scripts/optimize_licensed_models.mjs
```

The Blender stage saves normalized `.blend` and `.glb` files, geometry metadata,
and two inspection renders in `prepared/`. It rotates the cargo bow from +X to
Blender +Y; the tanker already points +Y. glTF export maps these bows to -Z and
the Blender Z-up axis to Y-up. Both hulls are one unit long, centered on X/Z,
with waterline Y=0. Source animations are excluded. Runtime fitting uses the
scenario's existing teaching length and heading.

The cargo source's keel is at Z=33.656; Z=40 is an illustrative waterline selected
from inspection, not a certified loading draught. The tanker retains its source
Z=0 waterline. Neither choice changes authored navigation geometry.

The Node stage emits separate desktop/mobile Meshopt/WebP derivatives and an
asset manifest. It checks bounds and pair transfer budgets (6 MB desktop,
3 MB mobile). Validate the outputs with the local glTF validator, run project
tests/build, and inspect the actual browser rendering after reprocessing.

Only optimized derivatives belong under `public/`. Do not copy the original
archives, source textures or Blender intermediates there.
