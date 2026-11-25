# Architecture

Engine Explorer is a single-page Vite app. Milestone 1 is the shell, checks, and a placeholder 3D scene. Later milestones add the model, selection, and repair content in the folders below.

## Layout

- `src/components/` — page UI and the React Three Fiber scene. `EngineCanvas` owns the canvas. `PlaceholderScene` is the rotating box until a model is loaded.
- `src/data/parts.json` — part content. It is an empty array for now. Each later entry is one part: an `id` that matches a mesh name, a `name`, a short `summary`, and `steps` for fixing or replacing it.
- `public/models/` — CC-licensed GLB files, served as static assets (for example `models/engine.glb`, under the `/engine-explorer/` base path).
- `src/test/` — shared Vitest setup. Smoke tests live next to the code they cover.

## Scene

`EngineCanvas` owns the React Three Fiber canvas. Orbit controls live in `PlaceholderScene`, which is the rotating box inside that canvas, until a model replaces it. A later milestone can keep the same scene component, swap the box for a GLB, and move the camera when someone taps a part. The page shell (header, stage, footer) stays put. The footer holds the orbit hint and is reserved for model credits.
