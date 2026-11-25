# Model credits

The engine shown in the app is one CC0 model. Its textures are packed inside the same GLB. Nothing else is loaded.

## Car engine

| | |
| --- | --- |
| File | `public/models/engine.glb` |
| What it is | Stylized inline-four car engine, about 0.71 × 0.71 × 0.81 m (W × D × H), one mesh |
| Source | [Car Engine on Grab3D](https://grab3d.com/models/vehicles/car-engine/) |
| Author | Grab3D |
| License | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/legalcode) (public domain; attribution not required) |
| Direct file | https://grab3d.com/dl/car-engine/car-engine.glb |
| Downloaded | 2026-11-25 |

Grab3D's package says the mesh and textures were built with Blender scripts. Those scripts were written with an AI coding assistant. No generative model produced the geometry or textures. The same note is in the download's `LICENSE.txt`.

The app footer still names Grab3D and links to the source page.

## Textures

All three images are embedded JPEGs in `engine.glb`. They are not separate downloads. Same author, source page, and CC0 license as the mesh.

| Image name | Maps |
| --- | --- |
| `car-engine_body_basecolor` | Base color |
| `car-engine_body_normal` | Normal |
| `car-engine_body_metallic-car-engine_body_roughness` | Metallic and roughness |

## What is one mesh

The GLB has two nodes, `car-engine` (an empty parent) and `car-engine_body` (the only mesh). The valve cover, ignition coils, intake, serpentine belt, alternator, water pump, and oil filter are sculpted into `car-engine_body`. They are not separate meshes, so `src/data/parts.json` lists that one mesh for the later selection work.
