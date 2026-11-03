# 1221 Broadway operations model

A Netlify-style map with a shared, seeded operations engine, deployed to https://1221-broadway.vercel.app. The model drives both playback and repeated scenario estimates. Package management uses pnpm.

## Run and verify

```sh
corepack pnpm install
corepack pnpm build
corepack pnpm test
```

Open `dist/index.html`; the app embeds its fonts, map data, logic, and worker and works offline. Tests use local Chrome on macOS; elsewhere run `corepack pnpm exec playwright install chromium` or set `CHROME_PATH`. Set `TEST_URL` to check a deployment. `pnpm test:engine` runs only the deterministic engine tests. Pushes to `main` deploy automatically to the personal Vercel scope `alen-rubilar`.

## What changed

- Staffing, load capacity, order cutoff, kitchen release, pickup work, traffic, tower service and absences are adjustable.
- Pickup time emerges from batch setup, loading per meal, kitchen readiness and a shared loading queue; it is not a universal 4- or 7.47-minute constant.
- Both Concord buildings have delivery events. Shelf completion respects the case's windows.
- Tower floor jobs combine available batches, share runners and elevators, and return runners to the lobby. Lobby delivery is a separate selectable operation. Runners start no earlier than the assumed 11:20 shift; a courier assigned to runner work is not reused as a driver.
- Reserve response and handoff delay the affected route. Without a reserve, the affected load is unserved. Runner replacement is a separate resource.
- A Web Worker runs 100–1,000 seeded scenarios without blocking playback. Outputs include conditional all-orders-on-time rate, P50/P95 completion, late/unserved orders and pickup distributions. Sensitivity runs use the same seeds.
- CSV observations can replace matching priors. Generated, reference and unverified rows cannot silently become observations. Exports contain configuration, sources, assumptions, seed, model version, source hash, estimates and representative events.

## Important evidence boundary

The default numerical service inputs are **generated engineering priors**, not local observations. The prior registry in `src/priors.mjs` records their units, bounds and rationale. Pickup setup and loading are distinct from kitchen and queue delays. Public platform documentation supports that decomposition; it does not establish these restaurants' service times. Public elevator specifications inform a plausible speed range but do not identify the equipment at 1221 Broadway.

The supplied Netlify reference provides outbound road geometry and stated typical-time ranges. Return routes in `data/return-routes.json` are fresh OSRM routing estimates with timestamps and source URLs, not observed traffic. Run `node scripts-refresh-roads.mjs` to refresh them. The return traffic inflation factors are assumptions.

The default global cutoff is unconfirmed. Entering a cutoff enforces preparation after that time; setting it late can make the current plan infeasible. A route-specific ordering policy and actual restaurant-to-building order mix still require confirmation.

The displayed confidence interval describes Monte Carlo sampling error **conditional on the inputs**. It does not include unknown input bias or validate a claim of real-world 95% reliability. Increasing the number of simulated days does not turn assumptions into measurements.

Full contracts, measurement definitions, limitations and required validation are in [docs/model.md](docs/model.md). Nothing in this app establishes legal pay compliance, food holding safety, actual elevator access, or an accepted production staffing plan.

## Files

- `src/engine.mjs`: discrete-event queues, resources, delivery windows and seeded draws.
- `src/priors.mjs`: explicit prior registry and primary-source references.
- `src/worker.mjs`: scenario sampling and sensitivity runs.
- `src/app.mjs`: controls, playback, imports and exports.
- `src/map.mjs`: map and event visualization.
- `template.html`: shell, fonts and styles.
- `data/`: reference map/routes, fresh return routing and observation schema.
- `build.mjs`: canonical self-contained build; `build.py` delegates to it.
- `SOURCE_README.md`: historical README for the original map package.

Map credit: OpenStreetMap contributors, OpenFreeMap and OSRM. Leaflet and embedded font licenses remain applicable.
