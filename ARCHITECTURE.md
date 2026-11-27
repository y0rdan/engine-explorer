# Architecture

Engine Explorer is a single-page Vite app. Milestone 1 is the shell, checks, and GitHub Pages deploy. Milestone 2 added a CC0 reference model. Milestone 3 replaces that model, as the default view, with a parametric inline-4 built in code, plus the engine data format and the tap-to-learn, explode, and assembly experience.

## Layout

- `src/components/` — page UI and the React Three Fiber scene. `EngineExperience` owns selection, the explode and assembly sliders, playback, and the part URL. `EngineCanvas` owns the canvas, studio lighting, orbit controls, and the demand render loop. `SceneDriver` advances the crank, applies explode and assembly offsets, and eases the camera. `PartsSidebar` and `PartPanel` are the accessible controls outside the 3D view.
- `src/engine/` — types, the runtime schema check, slider-crank math, explode and assembly placement, and URL helpers. These modules do not import React.
- `src/data/engines/` — one data module per engine. `catalog.ts` is the only registry. It runs each module through `parseEngine` and exports the list the page shows.
- `src/components/inline4/` — the inline-4 template: materials, named part and layer groups, and the code that writes those groups each frame.
- `src/components/vee/` — the shared V6 and V8 template. Bank angle, bore, stroke, cylinders per bank, and DOHC come from the engine's procedural params.
- `src/components/EnginePicker.tsx` and `EngineSwitcher.tsx` — the catalog screen and the compact switcher. They do not restyle the rest of the page.
- `public/hdri/` — the studio HDR used for image-based lighting. It is served from the site, not from a CDN.
- `reference/engine.glb` — the CC0 Grab3D inline-four kept as a reference. It is outside `public/`, so the Pages artifact does not upload it. The page does not load it. Credits stay in `MODEL_CREDITS.md`.
- `src/data/parts.json` — the old mesh inventory for that reference GLB. It is not the catalog the page renders.
- `src/test/` — shared Vitest setup. Tests live next to the code they cover.

## Engine data

An engine file is a plain object. `parseEngine` checks it at runtime and rejects unknown fields, so a typo fails the test run instead of shipping a half-read file. The fields are:

- Identity: `id`, `brand`, `model`, `engineCode`, `yearRange` (`end` may be `null`), `layout`, `displacementCc`.
- `layout` is `inline-4`, `v6`, or `v8`. That id is also the key in `src/engine/templates.ts`. The picker cards carry a `category` of `engine` so a later catalog can filter category before layout. This milestone does not build transmissions or brakes.
- `parameters`: `boreSpacing` in meters, `block` length/width/height, `intakeSide` and `exhaustSide` (`left` or `right`, and they must differ), `configuration` (`cylinders`, `banks`, `heads`, `valvetrain` of `dohc`, `sohc`, or `ohv`), and optional `accessories` positions keyed by part id. Block length is checked against the cylinders along one bank (`cylinders / banks`), so a V6 can be shorter than an inline-4.
- `parts`: the selectable pieces. Each part has a stable `id`, display copy, a `system`, a `category`, a short `summary`, a longer `description`, what it does, how it works, where it lives, key numbers, warning signs, difficulty (1–5), time, tools, fix or replace steps, maintenance, an optional safety note, an optional fun fact, and an optional `howItMoves` line.
- Every part has 2–4 `layers`. A layer has an id, name, description, an explode offset in meters, an assembly order, and a one-line assembly label. The part has the same assembly fields for the whole piece.
- Every part has a `fasteners` array. Each entry is a `FastenerGroup`: `id`, `type` (`bolt`, `nut`, `stud`, or `screw`), `size`, `name`, `count`, `positions`, `axis`, `torqueNm` (`min`, `max`, optional `angle`), `sequence`, `notes`, and `anchors` (or `null`). `positions`, `sequence`, and `anchors` (when set) are the same length as `count`. Torques are typical display values, not OEM charts. The V6 has 4 main caps and the V8 has 5, with side bolts. Each rod has 2 bolts, anchored to `rod:N` so they follow the rod. Head bolts use the id `head-bolts` on each head. Fasteners are one instanced mesh per type.

`system` is one of `engine`, `cooling`, `electrical`, `fuel-air`, `ignition`, `exhaust`, `drivetrain`, `brakes`, `suspension`, or `wheels`. The inline-4 uses the first five. The V engines also file the two manifolds under `exhaust`. The remaining systems are reserved so a later file can add them without a new field.

`assemblyOrder` is the build sequence. Milestone 4 can hang tools, torque, and notes on these same steps for a real engine such as a Toyota 2AR-FE. The validator is strict: add the new fields to `parseEngine` before a data file uses them.

The shipped engines are `generic-inline-4` (brand Generic, code G4, about 2.0 L), `generic-v6` (GV6, about 3.5 L, 60°), and `generic-v8` (GV8, about 5.0 L, 90° cross-plane). The shape matches a future `toyota-2zr-fe` or `honda-k20` file. Those files should not contain repair claims this project has not written.

Deep links use the page query, not a route. With no `engine` param the page shows the catalog. `/engine-explorer/?engine=generic-v6&part=crankshaft` opens that engine with the crank selected. The base path stays `/engine-explorer/` so GitHub Pages and the local dev server match. Changing engine clears the part, the explode amount, and the assembly or section mode, then the camera fits the new engine.

## Inline-4 template

`layoutFromEngine` turns bore spacing, block size, intake side, and accessory anchors into seated positions. `Inline4Engine` builds the block, head, valve cover, oil pan, intake, exhaust, crank, pistons, cam, and the ten service parts from rounded boxes, cylinders, and tubes. Each part is a group named `part:<id>`. Each layer is `layer:<id>:<layerId>`. Moving pieces carry a `userData` role (`spin`, `piston`, `rod`, `valve`, `glow`, `belt`) so one loop can pose them.

The look is a clean showroom: satin cast aluminum on the block, head, cover, and pistons; matte black plastic and rubber on the intake and belts; dark cast iron on the exhaust; zinc bolts; aluminum radiator fins; a plastic battery case. Roughness variation is a small canvas texture generated in the app. Highlights stay soft: roughness around 0.5 on the aluminum, a local Poly Haven studio HDR, a few analytic fill lights, and lightformers for a soft overhead key. The canvas is transparent over a dark radial gradient. The engine sits on a flat black disc with contact shadows.

The default camera is a three-quarter view from the front-left, slightly above the engine. Reset view returns to that direction. The fit uses the powertrain bounds (not the radiator and battery span) with about 1.28 padding, and CameraControls eases `setLookAt` unless the user is dragging. A bottom sheet or the desktop guide adds screen padding so the part stays in the clear area. `frameloop="demand"` stays on. The driver calls `invalidate` only while the crank, explode, assembly, or camera ease is still moving, and during a short idle bob. That bob runs for about four seconds after the last interaction, eases back to rest, and then stops requesting frames. Reduced motion skips it. Desktop DPR caps at 1.75 and phones at 1.25. Adaptive DPR runs on the larger screens. SSAO is not enabled. Contact shadows bake for the first frames, then hold, so a settled frame is not paying for a second full pass.

The engine sits on a small dark-metal stand and hovers with a slight idle bob for a few seconds after the camera settles. The bob stays off while Run, Assembly, or Explode is active, and when the user prefers reduced motion. Once it eases home, the demand loop sleeps. The stand is not a part and does not move in an explode. The floor is a dark-grey disc, lighter than pure black, with a contact shadow.

Each part may list `fasteners`. A fastener has a type (`bolt`, `nut`, `stud`, or `screw`), size, count, positions, axis, a `torqueNm` range (optional angle), a tightening `sequence`, and notes. Torque figures are typical display values. Assembly seats the part, then runs each fastener group: the pieces fly in from a tray and screw home. Teardown reverses that, highest sequence number first, and the step label reads like "Remove 10 x M6 valve cover bolts". Head bolts show their sequence numbers during that step. Fasteners are instanced by type. Tapping one shows size, count, and the torque note. It does not open the part guide. `parameters.configuration` records cylinders, banks, heads, and valvetrain so a later V6 or V8 file can override the same fields.

Section view turns on a clipping plane through the near side of the block, head, cover, and pan, and adds a short glow on the piston that is on its power stroke. Firing order is 1-3-4-2. Pistons 1 and 4 share a crank angle; 2 and 3 are opposite. The cam and its sprocket turn at half crank speed. The accessory pulleys and the fan use fixed ratios. Playback starts paused, including when the user prefers reduced motion. Reduced motion also snaps the camera and the explode play instead of easing. Speed runs from a slow 60 rpm up to an 800 rpm idle.

## Explode and assembly

The explode slider is linear. Later-installed parts start moving a little earlier so the spread reads as a sequence, and at 100% every offset is fully applied. Nothing overshoots. With no part selected, each part translates by its own `explodeOffset`: the valve cover goes straight up, the head and cam sit just below it, the oil pan goes down, the timing drive goes to the front-left, the intake goes to the right, the exhaust goes to the left, and the pistons and rods rise along the bore axis. With a part selected, the same slider separates that part's layers and the rest of the engine stays seated. View alone hides the other parts so the layer spread is the whole picture. Play explode eases from the current value to fully open, or back to closed, over about 3.4 seconds. The camera refits along the showroom direction while that runs, unless the user has grabbed the orbit.

Assembly mode uses the same offsets. Progress 0 is fully apart. Progress 1 is fully seated. Previous, next, and the step slider move one part (or, in View alone, one layer) at a time. Play assembly runs the build. Teardown runs it backward. The active step is highlighted and named under the controls.

## V template

`layoutVee` reads `parameters.configuration` and the layout id. A V6 is 60° with firing order 1-2-3-4-5-6. A V8 is 90° with firing order 1-8-4-3-6-5-7-2. Both use two banks and DOHC: two heads, two valve covers, two exhaust manifolds, and one intake plenum in the valley. Cams run at half crank speed. Each bank has its own timing chain on the front, and the accessory belt is a separate loop. The V6 and V8 meshes live in `createVee`, loaded apart from the inline-4 template.

The crank is solved from the bank angle and the firing order. A 60° V6 with order 1-2-3-4-5-6 gets split-pin throws: the two journals on one station are 60° apart, and the throw centers are 120° apart, so the engine fires every 120°. A 90° V8 with order 1-8-4-3-6-5-7-2 gets a cross-plane crank: one shared pin per station, pins 90° apart, front opposite rear and the middle pair opposite each other. Rods follow slider-crank math along each bank's bore axis, not straight up.

Odd-numbered cylinders sit on the left bank, the driver side when you look at the front of the engine: 1, 3, 5 on the V6 and 1, 3, 5, 7 on the V8. The V8 crank orbit is mirrored in Z so those cylinders can stay on the left and the pins still form a cross. Exploded heads and covers move outward along their own bank axis.

## How to add a layout template

1. Add the layout id to `LAYOUTS` in `src/engine/schema.ts` (`inline-4`, `v6`, `v8` today).
2. Write a pure function under `src/engine/` that turns an `EngineRecord` into a motion layout: crank center, rod length, anchors, and one cylinder record per bore (`phase`, `fireAngle`, `beta`, `boreAxis`, optional `crankMirror`). Register it in `builders` inside `src/engine/templates.ts` under that layout id.
3. Add a component under `src/components/` that builds named `part:` and `layer:` groups. Tag moving pieces with `userData.role` (`pistons`, `rods`, `valves`) or `spin`, `glow`, and `belt`. Tag sectioned castings with `userData.clip` and a `userData.kind` so the shared material applies the clipping plane only while Section is on. Point `EngineCanvas` at that component for the layout, and load it with `lazy()` so the template is its own chunk.
4. Keep `SceneDriver` on `layoutFor`. Placement, explode, assembly, Run, fastener motion, and the section plane stay engine-agnostic. Slider-crank uses `pistonPhaseOffset` (phase minus beta, or phase plus beta when the crank is mirrored).
5. Cover the new template with tests: cylinder count, bank or bore angles, firing order, phase offsets, a description on every part and layer, and the same WebGL stub draw budget as the inline-4 (40 frames, reset `renderer.info`, one more render, under 100 calls).

## How to add an engine

1. Add `src/data/engines/<id>.ts`. Set the identity, displacement, `layout`, and `parameters.configuration`. Copy `generic-inline-4.ts` for an inline engine, or `generic-v6.ts` / `veeParts.ts` for another V.
2. Give every part 2–4 layers, a description on the part and on each layer, repair steps, an assembly order, and a `fasteners` array (empty when nothing is unbolted). Head bolts that should show sequence badges use the id `head-bolts`.
3. Import it from `src/data/engines/catalog.ts` and add a card in `cards.ts` plus a branch in `loadEngine.ts`. `parseEngine` rejects a bad file when the catalog loads and when the tests run. The picker lists the cards. Filter chips are category, then layout, then search. No second registry. The page opens the picker when `?engine=` is absent, and `replaceState` drops an unknown engine id or a dead `?part=`.

## Loading and errors

The canvas still reports a browser that cannot start WebGL, through `CanvasErrorBoundary`. Studio HDR loading shows a status line and, if the file fails, an alert. The engine stays on screen with the analytic lights in that case. The Grab3D loader in `engineModel.ts` remains for the reference file and is not called on the default view.
