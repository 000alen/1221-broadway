import {names} from './engine.mjs';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function createMap(B,R){
const L=window.L;
const stopMarkers=new Map();

const css=getComputedStyle(document.documentElement), V=n=>css.getPropertyValue(n).trim();

const NAMES={Saucy:"Saucy Asian",Adeline:"Adeline",Wise:"Wise Sons",Kitava:"Kitava",SqPie:"Square Pie Guys",T1221:"1221 Broadway",CK:"Credit Karma",Alameda:"Science Alameda",SL:"WF San Leandro",Concord:"Concord Tech Center",WFConcord:"WF Concord"};
const RECORD=false;

/* ---------- map ---------- */
const map=L.map("map",{zoomSnap:0,zoomDelta:.5,zoomControl:false,attributionControl:true,preferCanvas:true,fadeAnimation:false,zoomAnimation:!RECORD,markerZoomAnimation:!RECORD});
map.attributionControl.setPrefix(false);
map.attributionControl.addAttribution('© OpenStreetMap contributors, OpenFreeMap, OSRM');
["base","roads","routes","trail","labels","couriers"].forEach((p,i)=>map.createPane(p).style.zIndex=200+i*50);
const rendB=L.canvas({padding:.5,pane:"base"}),rendR=L.canvas({padding:.5,pane:"roads"});
const poly=f=>/Polygon/.test(f.geometry.type);
L.geoJSON({type:"FeatureCollection",features:B.features.filter(f=>f.properties.k==="park"&&poly(f))},{pane:"base",renderer:rendB,interactive:false,style:{stroke:false,fillColor:V("--park"),fillOpacity:1}}).addTo(map);
L.geoJSON({type:"FeatureCollection",features:B.features.filter(f=>f.properties.k==="water"&&poly(f))},{pane:"base",renderer:rendB,interactive:false,style:{stroke:false,fillColor:V("--water"),fillOpacity:1}}).addTo(map);
const RS={motorway:[3.6,"--fwy",5.4,"--fwyedge"],trunk:[3,"--fwy",4.4,"--fwyedge"],primary:[2.4,"--road",3.6,"--roadedge"],secondary:[1.8,"--road",2.8,"--roadedge"],tertiary:[1.3,"--road",2.2,"--roadedge"],minor:[.9,"--road",1.6,"--roadedge"]};
const roadLayers=[];
for(const pass of [0,1]) for(const c of ["minor","tertiary","secondary","primary","trunk","motorway"]){
  const fs=B.features.filter(f=>f.properties.k==="road"&&f.properties.c===c); if(!fs.length) continue;
  const s=RS[c], mz=Math.min(...fs.map(f=>f.properties.minz));
  const l=L.geoJSON({type:"FeatureCollection",features:fs},{pane:"roads",renderer:rendR,interactive:false,style:pass?{color:V(s[1]),weight:s[0],lineCap:"round",lineJoin:"round"}:{color:V(s[3]),weight:s[2],lineCap:"round",lineJoin:"round"}});
  roadLayers.push([c==="minor"?13.5:c==="tertiary"?12.4:c==="secondary"?11.8:0,l]);
}
const labelLayers=[];
B.features.filter(f=>f.properties.k==="place"||f.properties.k==="ref").forEach(f=>{
  const p=f.properties; let c=f.geometry.coordinates,t=f.geometry.type;
  if(t==="LineString") c=c[Math.floor(c.length/2)]; else if(t==="MultiLineString") c=c[0][Math.floor(c[0].length/2)]; else if(t!=="Point") return;
  if(p.k==="ref"&&!/^(I|CA|US)?-?\s?\d+/.test(p.n)) return;
  if(p.k==="place"&&/^Concord$/i.test(p.n)) return;
  const html=p.k==="ref"?`<span class="shield">${esc(p.n.replace(/;.*/,""))}</span>`:`<span class="place">${esc(p.n)}</span>`;
  const mk=L.marker([c[1],c[0]],{pane:"labels",interactive:false,keyboard:false,icon:L.divIcon({className:"",html,iconSize:null,iconAnchor:[0,0]})});
  labelLayers.push([p.k==="ref"?12.2:Math.max(p.minz||0,(p.c==="city"?0:12.6)),mk]);
});
function refreshBase(){const z=map.getZoom();(typeof pickLabels!=="undefined")&&pickLabels.forEach(m=>m.setOpacity(z>=12.3?1:0));(typeof dtMk!=="undefined")&&dtMk.setOpacity(z>=12.3?0:1);for(const [mz,l] of roadLayers.concat(labelLayers)){const on=z>=mz;if(on&&!map.hasLayer(l))map.addLayer(l);else if(!on&&map.hasLayer(l))map.removeLayer(l);}}
map.on("zoomend",refreshBase);

// stops
const pickLabels=[];
const LBL={Saucy:["left",0,-2],Adeline:["right",0,-2],Wise:["left",0,-10],Kitava:["right",0,0],SqPie:["left",0,-8],T1221:["right",0,-12],CK:["right",4,10],Alameda:["right",0,0],SL:["right",0,0],Concord:["right",16,0]};
for(const [k,s] of Object.entries(R.stops)){

  const pick=s[1]==="pickup";
  const icon=pick?`<div style="width:13px;height:13px;border-radius:50%;background:#fff;border:2.5px solid #12110C"></div>`:`<div style="width:13px;height:13px;background:#12110C;border:2px solid #fff;box-shadow:0 0 0 1px #12110C"></div>`;
  const stopMarker=L.marker([s[2],s[3]],{pane:"labels",title:NAMES[k],alt:NAMES[k],icon:L.divIcon({className:"stop-target",html:icon,iconSize:[24,24],iconAnchor:[12,12]})}).addTo(map);stopMarker.bindPopup(()=>placePopup(k),{className:"operations-popup",autoPan:true,autoPanPaddingTopLeft:[20,72],autoPanPaddingBottomRight:[20,35],maxWidth:290});stopMarkers.set(k,stopMarker);
  const o=LBL[k]||["right",0,0]; const sub=k==="T1221"?'<span id="tower-label">Tower orders</span>':"";
  const name=NAMES[k];
  const html=`<div class="stoplbl ${pick?"":"drop"}" style="position:absolute;${o[0]==="left"?"right:12px":"left:12px"};top:${-11+o[2]}px">${esc(name)}${sub?`<small>${sub}</small>`:""}</div>`;
  const lm=L.marker([s[2],s[3]],{pane:"labels",interactive:true,keyboard:false,icon:L.divIcon({className:"stop-label-target",html,iconSize:[0,0],iconAnchor:[-o[1],0]})}).addTo(map);lm.on("click",()=>stopMarker.openPopup());
  if(pick||k==="CK"||k==="T1221") pickLabels.push(lm);
}
const benchMk=L.marker([R.bench.lat,R.bench.lng],{pane:"labels",interactive:false,keyboard:false,icon:L.divIcon({className:"",html:`<div style="width:14px;height:14px;border-radius:50%;background:#fff;border:2px dashed #525252"></div><div class="stoplbl" style="position:absolute;left:-36px;top:15px;color:#525252">Backup courier</div>`,iconSize:[14,14],iconAnchor:[7,7]})}).addTo(map);
pickLabels.push(benchMk);
const dtMk=L.marker([R.stops.T1221[2],R.stops.T1221[3]],{pane:"labels",interactive:false,keyboard:false,icon:L.divIcon({className:"",html:`<div class="stoplbl drop" style="position:absolute;left:14px;top:-14px">Downtown<small>1221 Broadway and Credit Karma</small></div>`,iconSize:[0,0]})}).addTo(map);

let routes=[],result=null;
function detail(title,subtitle,entries){const node=document.createElement('div');node.className='map-detail';const h=document.createElement('h3');h.textContent=title;const sub=document.createElement('p');sub.textContent=subtitle;node.append(h,sub);const grid=document.createElement('dl');for(const [label,value] of entries){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;grid.append(dt,dd);}node.append(grid);return node;}
function placePopup(k){if(!result)return detail(names[k]||k,'Location',[]);const pickup=R.stops[k][1]==='pickup';if(pickup){const loads=result.journeys.flatMap(j=>j.events.filter(e=>e.place===k&&e.kind==='pick'));return detail(names[k], 'Restaurant pickup', [['Loads collected',`${loads.filter(e=>e.dep<=lastTime).length} of ${loads.length}`],['Meals assigned',String(loads.reduce((n,e)=>n+e.n,0))],['Last pickup',time(Math.max(...loads.map(e=>e.dep)))]]);}const deliveries=result.deliveries.filter(e=>e.place===k),delivered=deliveries.filter(e=>e.t<=lastTime).reduce((n,e)=>n+e.n,0),expected=k==='T1221'?result.config.orders:10,deadline=k==='Alameda'?750:720,window=k==='T1221'?700:k==='Alameda'?720:690;return detail(names[k],'Office delivery',[['Ready for pickup',`${delivered} of ${expected} meals`],['Delivery window',`${time(window)}–${time(deadline)}`],['Expected finish',deliveries.reduce((n,e)=>n+e.n,0)===expected?time(Math.max(...deliveries.map(e=>e.t))):'Needs recovery']]);}

function cut(g,f){const d=[0];for(let i=1;i<g.length;i++)d.push(d[i-1]+Math.hypot(g[i][0]-g[i-1][0],(g[i][1]-g[i-1][1])*Math.cos(g[i][0]*Math.PI/180)));const goal=f*d.at(-1),out=[g[0]];for(let i=1;i<g.length;i++){if(d[i]>=goal){const q=(goal-d[i-1])/Math.max(1e-12,d[i]-d[i-1]);out.push([g[i-1][0]+(g[i][0]-g[i-1][0])*q,g[i-1][1]+(g[i][1]-g[i-1][1])*q]);return out;}out.push(g[i]);}return out;}
function fraction(j,m,t){const pause=j.pause?Math.max(0,Math.min(t,j.pause[1])-Math.max(m.start,j.pause[0])):0;return Math.max(0,Math.min(1,(t-m.start-pause)/m.duration));}
function state(j,t){if(j.abandoned&&j.pause&&t>=j.pause[0]){const m=j.moves.find(m=>m.start<=j.pause[0]&&m.end>=j.pause[0]);const e=j.events.at(-1);return{p:m?cut(m.geometry,fraction(j,m,j.pause[0])).at(-1):[R.stops[e.place][2],R.stops[e.place][3]],text:'Unserved load; courier unavailable',progress:.5};}if(t<j.start)return{p:[R.stops.Saucy[2],R.stops.Saucy[3]],text:`Starts ${time(j.start)}`,progress:0};const m=j.moves.find(m=>t>=m.start&&t<m.end);if(m){const p=cut(m.geometry,fraction(j,m,t)).at(-1);return{p,text:j.pause&&t>=j.pause[0]&&t<j.pause[1]?(j.abandoned?'Courier unavailable; load needs rescue':'Waiting for reserve'): `Driving to ${names[m.to]}`,progress:(t-j.start)/Math.max(1,j.end-j.start)};}const e=j.events.find(e=>t>=e.arr&&t<e.dep);if(e)return{p:[R.stops[e.place][2],R.stops[e.place][3]],text:j.pause&&t>=j.pause[0]&&t<j.pause[1]?'Waiting for reserve':t<e.start?`Waiting at ${names[e.place]}`:e.kind==='pick'?`Loading ${e.n} meals at ${names[e.place]}`:`Unloading ${e.n} at ${names[e.place]}`,progress:(t-j.start)/Math.max(1,j.end-j.start)};const last=j.events.at(-1);return{p:last?[R.stops[last.place][2],R.stops[last.place][3]]:[R.stops.Saucy[2],R.stops.Saucy[3]],text:j.abandoned?'Unserved load':`Route complete ${time(j.end)}`,progress:j.abandoned?.5:1};}
function setResult(next){result=next;const label=document.getElementById('tower-label');if(label)label.textContent=`${result.config.orders} orders, ${result.config.towerMode==='floors'?result.config.floors+' occupied floors':'lobby shelf'}`;routes.forEach(o=>o.layers.forEach(l=>map.removeLayer(l)));routes=result.journeys.map((j,i)=>{const layers=[];j.moves.forEach(m=>{layers.push(L.polyline(m.geometry,{pane:'routes',color:j.color,weight:3,opacity:.22,interactive:false}).addTo(map));});const trail=L.polyline([],{pane:'trail',color:j.color,weight:4,interactive:false}).addTo(map);const marker=L.marker([R.stops.Saucy[2],R.stops.Saucy[3]],{pane:'couriers',title:j.name,alt:j.name,icon:L.divIcon({className:'',html:`<div class="cm" style="background:${j.color}">${i+1}</div>`,iconSize:[24,24],iconAnchor:[12+(i%4-1.5)*4,12]})}).addTo(map);marker.bindPopup(()=>detail(j.name,state(j,lastTime).text,[['Meals on route',String(j.load)],['Route starts',time(j.start)],['Route finishes',time(j.end)]]),{className:'operations-popup',autoPan:true,autoPanPaddingTopLeft:[20,72],autoPanPaddingBottomRight:[20,35],maxWidth:290});layers.push(trail,marker);return{j,trail,marker,layers};});}
const OAK=L.latLngBounds([[37.795,-122.300],[37.845,-122.252]]),BAY=L.latLngBounds([[37.712,-122.32],[37.99,-122.0]]);let lastCam='',lastTime=570,lastView='auto';
function draw(t,view='auto'){lastTime=t;lastView=view;if(!result)return[];let u=view==='oak'?0:view==='bay'?1:Math.max(0,Math.min(1,(t-640)/15));const a=map.getBoundsZoom(OAK,false,[40,90]),b=map.getBoundsZoom(BAY,false,[40,90]),ca=OAK.getCenter(),cb=BAY.getCenter(),center=L.latLng(ca.lat+(cb.lat-ca.lat)*u,ca.lng+(cb.lng-ca.lng)*u),z=a+(b-a)*u,key=center.toString()+z;if(key!==lastCam){lastCam=key;map.setView(center,z,{animate:false});}const states=routes.map(o=>{const s=state(o.j,t);o.marker.setLatLng(s.p);const trails=o.j.moves.filter(m=>t>m.start).map(m=>cut(m.geometry,fraction(o.j,m,t)));o.trail.setLatLngs(trails);return s;});for(const [k,marker] of stopMarkers)if(marker.isPopupOpen())marker.getPopup().setContent(placePopup(k));for(const o of routes)if(o.marker.isPopupOpen())o.marker.getPopup().setContent(detail(o.j.name,state(o.j,t).text,[['Meals on route',String(o.j.load)],['Route starts',time(o.j.start)],['Route finishes',time(o.j.end)]]));refreshBase();return states;}
map.setView(OAK.getCenter(),12);window.addEventListener('resize',()=>{lastCam='';map.invalidateSize();draw(lastTime,lastView);});
return{setResult,draw,map,focusRoute(index){const route=routes[index];if(route){map.panTo(route.marker.getLatLng(),{animate:false});route.marker.openPopup();}}};
}
export function time(t){if(!Number.isFinite(t))return 'Unserved';const n=Math.ceil(t-1e-7);return `${n>=1440?'Day '+(Math.floor(n/1440)+1)+' ':''}${Math.floor(n/60)%12||12}:${String(n%60).padStart(2,'0')}`;}
