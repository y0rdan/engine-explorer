# Architecture

Engine Explorer is a single-page Vite app. Milestone 1 is the shell, checks, and GitHub Pages deploy. Milestone 2 added a CC0 reference model. Milestone 3 replaces that model, as the default view, with a parametric inline-4 built in code, plus the engine data format and the tap-to-learn, explode, and assembly experience.

## Layout

- `src/components/` — page UI and the React Three Fiber scene. `EngineExperience` owns selection, the explode and assembly sliders, playback, and the part URL. `EngineCanvas` owns the canvas, studio lighting, orbit controls, and the demand render loop. `SceneDriver` advances the crank, applies explode and assembly offsets, and eases the camera. `PartsSidebar` and `PartPanel` are the accessible controls outside the 3D view.
- `src/engine/` — types, the runtime schema check, slider-crank math, explode and assembly placement, and URL helpers. These modules do not import React.
- `src/data/engines/` — one data module per engine. `catalog.ts` runs each module through `parseEngine` and exports the engine the page shows.
- `src/components/inline4/` — the inline-4 template: materials, named part and layer groups, and the code that writes those groups each frame.
- `public/hdri/` — the studio HDR used for image-based lighting. It is served from the site, not from a CDN.
- `public/models/engine.glb` — the CC0 Grab3D inline-four kept as a reference. The page does not load it. Credits stay in `MODEL_CREDITS.md`.
- `src/data/parts.json` — the old mesh inventory for that reference GLB. It is not the catalog the page renders.
- `src/test/` — shared Vitest setup. Tests live next to the code they cover.

## Engine data

An engine file is a plain object. `parseEngine` checks it at runtime and rejects unknown fields, so a typo fails the test run instead of shipping a half-read file. The fields are:

- Identity: `id`, `brand`, `model`, `engineCode`, `yearRange` (`end` may be `null`), `layout`, `displacementCc`.
- `parameters`: `boreSpacing` in meters, `block` length/width/height, `intakeSide` and `exhaustSide` (`left` or `right`, and they must differ), and optional `accessories` positions keyed by part id.
- `parts`: the selectable pieces. Each part has a stable `id`, display copy, a `system`, a `category`, a short `summary`, a longer `description`, what it does, how it works, where it lives, key numbers, warning signs, difficulty (1–5), time, tools, fix or replace steps, maintenance, an optional safety note, an optional fun fact, and an optional `howItMoves` line.
- Every part has 2–4 `layers`. A layer has an id, name, description, an explode offset in meters, an assembly order, and a one-line assembly label. The part has the same assembly fields for the whole piece.

`system` is one of `engine`, `cooling`, `electrical`, `fuel-air`, `ignition`, `exhaust`, `drivetrain`, `brakes`, `suspension`, or `wheels`. This engine uses the first five. The others are reserved so a later file can add them without a new field.

`assemblyOrder` is the build sequence. Milestone 4 can hang tools, torque, and notes on these same steps for a real engine such as a Toyota 2AR-FE. The validator is strict: add the new fields to `parseEngine` before a data file uses them.

The shipped engine is `generic-inline-4` (brand Generic, code G4). The shape matches a future `toyota-2zr-fe` or `honda-k20` file. Those files should not contain repair claims this project has not written.

Deep links use the page query, not a route: `/engine-explorer/?part=radiator`. The base path stays `/engine-explorer/` so GitHub Pages and the local dev server match.

## Inline-4 template

`layoutFromEngine` turns bore spacing, block size, intake side, and accessory anchors into seated positions. `Inline4Engine` builds the block, head, valve cover, oil pan, intake, exhaust, crank, pistons, cam, and the ten service parts from rounded boxes, cylinders, and tubes. Each part is a group named `part:<id>`. Each layer is `layer:<id>:<layerId>`. Moving pieces carry a `userData` role (`spin`, `piston`, `rod`, `valve`, `glow`, `belt`) so one loop can pose them.

The look is a clean showroom: satin cast aluminum on the block, head, cover, and pistons; matte black plastic and rubber on the intake and belts; dark cast iron on the exhaust; zinc bolts; aluminum radiator fins; a plastic battery case. Roughness variation is a small canvas texture generated in the app. Highlights stay soft: roughness around 0.5 on the aluminum, a local Poly Haven studio HDR, a few analytic fill lights, and lightformers for a soft overhead key. The canvas is transparent over a dark radial gradient. The engine sits on a flat black disc with contact shadows.

The default camera is a three-quarter view from the front-left, slightly above the engine. Reset view returns to that direction and frames whatever is visible. `frameloop="demand"` stays on. The driver calls `invalidate` only while the crank, explode, assembly, or camera ease is still moving. Desktop DPR caps at 1.75 and phones at 1.25. Adaptive DPR runs on the larger screens. SSAO is not enabled: a postprocessing pass fights the demand loop and is too expensive on a mid-range phone. Contact shadows and the studio HDR do the grounding instead.

Section view turns on a clipping plane through the near side of the block, head, cover, and pan, and adds a short glow on the piston that is on its power stroke. Firing order is 1-3-4-2. Pistons 1 and 4 share a crank angle; 2 and 3 are opposite. The cam and its sprocket turn at half crank speed. The accessory pulleys and the fan use fixed ratios. Playback starts paused, including when the user prefers reduced motion. Reduced motion also snaps the camera and the explode play instead of easing. Speed runs from a slow 60 rpm up to an 800 rpm idle.

## Explode and assembly

The explode slider is linear. Later-installed parts start moving a little earlier so the spread reads as a sequence, and at 100% every offset is fully applied. Nothing overshoots. With no part selected, each part translates by its own `explodeOffset`: the valve cover goes straight up, the head and cam sit just below it, the oil pan goes down, the timing drive goes to the front-left, the intake goes to the right, the exhaust goes to the left, and the pistons and rods rise along the bore axis. With a part selected, the same slider separates that part's layers and the rest of the engine stays seated. View alone hides the other parts so the layer spread is the whole picture. Play explode eases from the current value to fully open, or back to closed, over about 3.4 seconds. The camera refits along the showroom direction while that runs, unless the user has grabbed the orbit.

Assembly mode uses the same offsets. Progress 0 is fully apart. Progress 1 is fully seated. Previous, next, and the step slider move one part (or, in View alone, one layer) at a time. Play assembly runs the build. Teardown runs it backward. The active step is highlighted and named under the controls.

## How to add an engine

1. Copy `src/data/engines/generic-inline-4.ts`. Set the identity, displacement, bore spacing, block size, intake and exhaust sides, accessory anchors, and parts. Every part needs 2–4 layers, a description on the part and on each layer, and an assembly order.
2. Import it from `src/data/engines/catalog.ts` and add it to `engines`. `parseEngine` will reject a bad file when the catalog loads and when the tests run.
3. If `layout` is still `inline-4`, the existing template is enough. A new layout, such as a V6, needs a new component under `src/components/` and a branch where `EngineCanvas` chooses the template from `engine.layout`. Register the new layout id in `LAYOUTS` inside `src/engine/schema.ts`.

## Loading and errors

The canvas still reports a browser that cannot start WebGL, through `CanvasErrorBoundary`. Studio HDR loading shows a status line and, if the file fails, an alert. The engine stays on screen with the analytic lights in that case. The Grab3D loader in `engineModel.ts` remains for the reference file and is not called on the default view.
