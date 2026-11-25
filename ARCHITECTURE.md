# Architecture

Engine Explorer is a single-page Vite app. Milestone 1 is the shell, checks, and GitHub Pages deploy. Milestone 2 loads a CC0 engine model into that shell. Later milestones add selection and repair content in the folders below.

## Layout

- `src/components/` — page UI and the React Three Fiber scene. `EngineCanvas` owns the canvas, the orbit controls, keyboard panning, and the bounds fit. `EngineControls` attaches arrow keys after the controls connect. The model loads from `public/models/engine.glb` through `import.meta.env.BASE_URL`.
- `src/data/parts.json` — starter inventory for selection. Each entry has an `id`, a `displayName`, and `meshNames` (glTF node or mesh names on the loaded model). `src/data/parts.ts` checks that shape. Summaries and repair steps come in a later milestone.
- `public/models/` — CC-licensed GLB files, served as static assets. Load them as `` `${import.meta.env.BASE_URL}models/...` `` so the `/engine-explorer/` project path is included. Do not hard-code a site-root `/models/...` path.
- `MODEL_CREDITS.md` — source, author, license, and URL for every shipped model and texture.
- `src/test/` — shared Vitest setup. Smoke tests live next to the code they cover.

## Scene

`EngineCanvas` owns the React Three Fiber canvas. Orbit controls and the fit that frames the model on every viewport size live here. The loaded model is static, so the canvas uses `frameloop="demand"` and redraws while someone orbits, zooms, or pans. The page shell (header, stage, footer) stays put. The footer holds the orbit hint and the model credit.

The model request is `useGLTF.preload` with Draco disabled. The loading message and the failed-load alert are DOM next to the canvas, not inside it. `CanvasErrorBoundary` still covers a browser that cannot start the 3D view.
