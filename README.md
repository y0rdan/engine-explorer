# Engine Explorer

Engine Explorer is a responsive web app that shows a 3D car engine. You tap a part to zoom in and learn how to fix or replace it.

The app shell, a CC0 engine model, automatic checks, and a free GitHub Pages deploy are in place. Part selection and repair write-ups come in later milestones. No paid services and no secrets. Model credits are in [MODEL_CREDITS.md](MODEL_CREDITS.md).

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

## Roadmap

1. **Setup and deploy** — app shell, CI, and GitHub Pages.
2. **3D viewer** — CC0 inline-four engine, orbit, zoom, and keyboard pan.
3. **Tap to select** — highlight the part, zoom the camera, and open an info panel.
4. **Content** — diagrams and repair steps for about 10 parts, plus a safety note.
5. **Polish** — search, performance, and accessibility.

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md). In short: UI in `src/components/`, part copy in `src/data/parts.json`, and GLB files in `public/models/`.
