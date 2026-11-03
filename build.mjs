import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [template, css, js, basemap, routes] = await Promise.all([
  read('template.html'),
  read('node_modules/leaflet/dist/leaflet.css'),
  read('node_modules/leaflet/dist/leaflet.js'),
  read('data/basemap.json').then(JSON.parse),
  read('data/routes.json').then(JSON.parse),
]);

// Preserve the filtering and coordinate precision of the original build.py.
basemap.features = basemap.features.filter((f) =>
  ['water', 'park', 'road', 'place', 'ref'].includes(f.properties.k),
);
const round = (value) => {
  if (typeof value === 'number') return Math.round(value * 100000) / 100000;
  if (Array.isArray(value)) return value.map(round);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, round(item)]));
  }
  return value;
};
const replacements = {
  '/*LEAFLET_CSS*/': css,
  '/*LEAFLET_JS*/': js.replaceAll('</script', '<\\/script'),
  '/*BASEMAP*/': JSON.stringify(round(basemap)),
  '/*ROUTES*/': JSON.stringify(routes),
};
let html = template;
for (const [marker, content] of Object.entries(replacements)) {
  if (!html.includes(marker)) throw new Error(`Missing template marker: ${marker}`);
  html = html.replace(marker, () => content);
}
const output = new URL('dist/', root);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), html);
console.log(`Built ${fileURLToPath(new URL('index.html', output))} (${Buffer.byteLength(html)} bytes)`);
