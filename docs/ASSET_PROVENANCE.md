# Vessel asset provenance

Acquired: 2026-10-24. The licensed cargo and tanker source packages were supplied by the user. Their embedded `license.txt` files identify both works as CC BY 4.0 and require creator credit. The exact attribution strings are preserved in [`public/models/licensed/LICENSES.txt`](../public/models/licensed/LICENSES.txt), and the machine-readable credits are in [`public/models/licensed/credits.json`](../public/models/licensed/credits.json).

| Role | Model | Author | Source | License | Source package status |
| --- | --- | --- | --- | --- | --- |
| Cargo/container ship | Cargo ship, UID `b7c97df584824ca682d26daabf401f87` | hungry_drifter | https://sketchfab.com/3d-models/cargo-ship-b7c97df584824ca682d26daabf401f87 | CC BY 4.0 | Acquired; source files are intended for `assets/source-models/cargo/`, with the original ZIP retained under `assets/source-models/archives/`. |
| Tanker | Tanker Ship, UID `96ebf61af42b4062ae98a6ad848e1a25` | KoreanNavy | https://sketchfab.com/3d-models/tanker-ship-96ebf61af42b4062ae98a6ad848e1a25 | CC BY 4.0 | Acquired; source files are intended for `assets/source-models/tanker/`, with the original ZIP retained under `assets/source-models/archives/`. |

The earlier candidate entry named Art Blender as the tanker author. The supplied tanker archive's own `license.txt` names KoreanNavy and gives https://sketchfab.com/KoreanNavy; this is the attribution used here. The archive names, source UIDs, and titles match the selected candidate pair. The embedded license files report CC-BY-4.0, the creator credit requirement, and that commercial use is allowed.

Completed processing: Blender 5.2.2 LTS normalizes axes/waterlines and exports static GLBs; glTF Transform 4.5.1 deduplicates, joins, welds and Meshopt-compresses geometry and converts cargo PBR textures to WebP. Desktop preserves source triangles and 2048 px textures; mobile uses conservative geometry simplification and 1024 px WebP textures (quality 37 to meet the strict pair budget). The tanker package has material colors but no image textures. Do not describe it as a textured scan.

Original archives are retained outside `public/` with SHA-256 hashes in `assets/source-models/archives/manifest.json`. The regeneration instructions are in `assets/source-models/README.md`. Only the four optimized web derivatives and attribution/manifest files are shipped. The runtime maps the corresponding authored legacy asset paths to these variants, leaving scenario JSON unchanged; narrow screens below 768 px select mobile variants on scene creation. Credits are accessible in opening and workspace footers.

| Derivative | Bytes | Triangles |
| --- | ---: | ---: |
| Cargo desktop | 3,727,632 | 73,448 |
| Tanker desktop | 2,118,388 | 192,789 |
| Cargo mobile | 951,352 | 62,426 |
| Tanker mobile | 2,044,400 | 177,637 |

The desktop pair is 5,846,020 bytes (limit 6,000,000), and mobile is 2,995,752 bytes (limit 3,000,000). The generated manifest records each file's hash, world bounds and processing settings. All four decoded assets retain unit Z length, centered X/Z and a waterline crossing Y=0, with no source animation. Source-to-derivative maximum world-bound shifts are below 0.000025 normalized lengths. All four glTF validations report zero errors; the cargo has generated-tangent warnings, and the validator cannot validate the Meshopt extension internally. The runtime decoder and automated decoded-bounds checks pass separately.

## Fit and scene constraints

The authored Rule 14 scenario remains the source of positions, headings, timing, and paired starboard maneuvers. Fit models visually in the runtime loader to the existing teaching lengths (90 m and 110 m in the head-on scenario). Do not change scenario track data or teaching lengths to match advertised ship dimensions. During asset validation, check source axes, waterline, bow direction, bounds, texture and material counts, and rendering at those teaching scales. Compare the optimized pair size against the 6 MB desktop / 3 MB mobile pair target; reduction or LOD may be needed. Preserve the source packages and license notices for provenance, while shipping optimized web copies in the app.

## Earlier candidate research

The earlier research considered these same Sketchfab records as candidates; the supplied archives now establish acquisition and the exact license version. The earlier tanker author attribution was incorrect and is transparently corrected above based on the included license file. Kenney's [Watercraft Kit](https://kenney.nl/assets/watercraft-kit) was also considered as a CC0 alternative and was not selected.
