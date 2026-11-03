# Launch day map: source

The deployed file (`launch_day_map.html`, uploaded to Netlify as `index.html`) is generated from these files. It is one self-contained page: Leaflet, fonts, basemap and route data are all inlined, so it works offline and anywhere it's hosted.

## Files

- `template.html` is the page itself: layout, styles and all map logic (JavaScript at the bottom). Edit this to change wording, colors, layout or behavior.
- `data/routes.json` holds courier routes, stop locations, road geometry and the simulated timeline (arrival and departure minutes for each stop).
- `data/basemap.json` holds the background map (roads, water, parks, place labels) as GeoJSON from OpenStreetMap via OpenFreeMap.
- `build.py` fills the template with Leaflet, the fonts and both data files, and writes `launch_day_map.html`.

## Rebuild

```
npm install leaflet@1.9.4
python3 build.py
```

Then open `launch_day_map.html` in a browser, or upload it to Netlify as `index.html`.

The Newsreader and Inter fonts are already embedded in `template.html` (the long base64 `@font-face` block at the top of the first `<style>`), so you don't need to install them.

## Where to change things

- Brand colors: the `:root` block at the top of the `<style>` in `template.html`
- Panel wording: the `<aside>` markup, and the `SHORT`, `NAMES` and `EVENTS` constants in the script
- Deadlines: `DL` (minutes after midnight, e.g. 710 = 11:50)
- Camera views: `OAK` and `BAY` bounds; Follow mode switches between them from 10:47 to 10:56
- Timeline ticks: `TK`
