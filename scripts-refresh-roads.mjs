import {readFile,writeFile} from 'node:fs/promises';
const ref=JSON.parse(await readFile(new URL('./data/routes.json',import.meta.url),'utf8'));
const results=[];
for(const from of ['WFConcord','Alameda','CK','T1221']){
 const a=ref.stops[from],b=ref.stops.Saucy;
 const source=`https://router.project-osrm.org/route/v1/driving/${a[3]},${a[2]};${b[3]},${b[2]}?overview=full&geometries=geojson`;
 const response=await fetch(source);if(!response.ok)throw Error(`OSRM ${response.status}`);
 const json=await response.json(),route=json.routes?.[0];if(!route)throw Error('No route');
 results.push({from,to:'Saucy',minutes:route.duration/60,metres:route.distance,geometry:route.geometry.coordinates.map(([lng,lat])=>[lat,lng]),source,retrievedAt:new Date().toISOString(),evidence:'routing-model',note:'Static routing duration, not observed driving or live traffic.'});
}
await writeFile(new URL('./data/return-routes.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(results.map(({from,minutes,metres})=>({from,minutes,metres})));
