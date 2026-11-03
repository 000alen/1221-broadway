# Launch day at 1221 Broadway

Source of the existing Netlify route visualization, packaged for Vercel. This repository preserves the supplied template, route data, basemap and original Python builder. It does not incorporate the separate Next.js prototype or alter the route schedule.

## Build

```sh
corepack pnpm install
corepack pnpm build
```

Open `dist/index.html`. The built page includes Leaflet, fonts, route data and the basemap and works offline.

Run `corepack pnpm test` for browser regression checks covering playback speeds, real courier movement, pause/resume, replay, mobile layout and high-refresh screens. The tests use local Google Chrome on macOS; elsewhere install Chromium with `corepack pnpm exec playwright install chromium` or set `CHROME_PATH`. Set `TEST_URL` to run the same checks against a deployed site.

- `template.html`: layout, styles, fonts and playback logic.
- `data/routes.json`: precomputed courier events and road geometry.
- `data/basemap.json`: map features.
- `build.mjs`: Node build used by Vercel, equivalent to the original builder's assembly/filtering.
- `build.py`: original Python builder, retained unchanged.
- `SOURCE_README.md`: original source instructions, retained unchanged.
- `vercel.json`: static deployment configuration; output is `dist/`.

## Deploy

This project targets the personal Vercel scope `alen-rubilar`.

```sh
vercel --scope alen-rubilar --prod
```

Route timings and percentile fields are supplied inputs. The playback does not calculate operational reliability, hiring requirements, or labor cost.

Map attribution: OpenStreetMap contributors, OpenFreeMap and OSRM. Leaflet and embedded font licenses remain applicable.
