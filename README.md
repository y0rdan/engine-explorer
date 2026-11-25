# Engine Explorer

Engine Explorer is a responsive web app that shows a 3D car engine. You tap a part to zoom in and learn how to fix or replace it.

The app shell, a parametric inline-4, part guides, explode and assembly controls, automatic checks, and a free GitHub Pages deploy are in place. A CC0 reference model stays in the repo and is not loaded. No paid services and no secrets. Credits are in [MODEL_CREDITS.md](MODEL_CREDITS.md).

Live site, after Pages is enabled and `main` is deployed: [https://y0rdan.github.io/engine-explorer/](https://y0rdan.github.io/engine-explorer/)

## Run locally

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open [http://localhost:5173/engine-explorer/](http://localhost:5173/engine-explorer/). The `/engine-explorer/` path is the Vite `base`, so local URLs match the GitHub Pages project site.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run lint` | Lint with oxlint |
| `npm run typecheck` | Typecheck with `tsc -b` |
| `npm test` | Run Vitest once |
| `npm run build` | Typecheck and write `dist/` |
| `npm run preview` | Serve the production build |

## Deploy

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pull requests: install, lint, typecheck, test, and build.

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs on every push to `main`. It lints, typechecks, and tests, then builds the site and deploys `dist/` with the official GitHub Pages actions (`configure-pages`, `upload-pages-artifact`, and `deploy-pages`). You can also run that workflow by hand from the Actions tab.

Vite's `base` is `/engine-explorer/`, which is the path for `https://y0rdan.github.io/engine-explorer/`.

### Turn on GitHub Pages

The workflow cannot switch this on. GitHub only lets a separate admin token change the Pages source, and this repo has no secrets.

After this setup is on `main`:

1. Open [Settings → Pages](https://github.com/y0rdan/engine-explorer/settings/pages).
2. Under **Build and deployment**, open **Source** and choose **GitHub Actions**.

The next push to `main` publishes the site. If the workflow already ran and failed before this switch, open **Actions → Deploy to GitHub Pages** and run it again.

Open a part directly with a query on the project path, for example [http://localhost:5173/engine-explorer/?part=radiator](http://localhost:5173/engine-explorer/?part=radiator). Choosing a part updates that query. Esc, or Close, returns to the whole engine.

## Add an engine

1. Copy [`src/data/engines/generic-inline-4.ts`](src/data/engines/generic-inline-4.ts). Fill in the identity (`brand`, `model`, `engineCode`, years, displacement), the inline-4 parameters (bore spacing, block size, which side the intake and exhaust sit on, accessory positions), and the parts. Each part needs a description, and each of its 2–4 layers needs one too.
2. Register the file in [`src/data/engines/catalog.ts`](src/data/engines/catalog.ts). The schema check runs as the catalog loads.
3. A new arrangement, such as a V6 or a boxer, needs a new layout template component and a new `layout` id in [`src/engine/schema.ts`](src/engine/schema.ts). An inline-4 can reuse the template that is already here.

A later file such as `toyota-2zr-fe.ts` can use the same fields. Do not add brand repair claims that have not been written for this project. Assembly order is the hook a later milestone can use for torque, tools, and notes.

## Roadmap

1. **Setup and deploy** — app shell, CI, and GitHub Pages.
2. **3D viewer** — orbit, zoom, and keyboard pan. The CC0 reference model stays in the repo.
3. **Inline-4 template** — parametric engine, part guides, explode, assembly, and a running crank.
4. **Real engines** — data files for production engines, with service steps attached to the assembly order.
5. **Polish** — search, and more layouts (V6, boxer, and the rest).

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md). In short: UI in `src/components/`, engine files in `src/data/engines/`, the inline-4 template in `src/components/inline4/`, and the reference GLB in `public/models/`.
