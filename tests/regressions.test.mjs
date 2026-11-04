import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,simulate,atTime,validate} from '../src/engine.mjs';
import {comparisonPlans} from '../src/worker.mjs';
const reference=JSON.parse(readFileSync(new URL('../data/routes.json',import.meta.url)));
// Synthetic deterministic timings isolate scheduling behavior, not calibration.
const observation=(kind,minutes,key='*')=>({kind,key,minutes,evidence:'observed',source:'test fixture only',observed_at:'fixture'});
const observations=[
 ...Object.keys(reference.legs).map(key=>observation('travel',1,key.replace('ConcordTech>','Concord>'))),
 ...[['pickup',1],['ready',0],['intake',1],['floor',.1],['floor-setup',.5],['elevator',1],['drop',1],['drop-per-order',0],['handoff',1],['backup',10],['handoff',5]].map(([kind,minutes],i)=>observation(kind,minutes,kind==='handoff'&&i===10?'courier':kind==='handoff'?'T1221':'*')),
];
const fixed={...defaults,kitchenDelay:0,loadingPositions:4,observations};
function noOverlap(result){
 const groups=new Map();
 for(const e of result.resourceLog){assert(e.end>=e.start);const key=e.resource+':'+e.slot;const list=groups.get(key)||[];list.push(e);groups.set(key,list);}
 for(const list of groups.values()){list.sort((a,b)=>a.start-b.start);for(let i=1;i<list.length;i++)assert(list[i].start>=list[i-1].end-1e-8);}
}
test('early batches consolidate at runner departure instead of booking duplicate visits',()=>{
 const r=simulate({...defaults,allowPrestage:true},reference);
 const visits=r.floorEvents.filter(e=>e.kind==='floor');
 assert.equal(visits.length,16);assert.equal(visits.reduce((n,e)=>n+e.n,0),200);
 assert(visits.every(e=>e.n<=r.config.cartCapacity));noOverlap(r);
});
test('staging releases runners before opening while meals become available at the window',()=>{
 const c={...fixed,orders:40,floors:4,runners:1,allowPrestage:true};const r=simulate(c,reference);
 assert(r.floorEvents.filter(e=>e.kind==='floor').every(e=>e.end<700));
 assert(r.resourceLog.filter(e=>e.resource==='runner').every(e=>e.end<700));
 assert.equal(atTime(r,699.99).tower,0);assert.equal(atTime(r,700).tower,40);
 assert(r.towerCompletion<simulate({...c,allowPrestage:false},reference).towerCompletion);
 noOverlap(r);
});
test('a batch arriving during a floor trip merges into unclaimed queued floor work',()=>{
 const r=simulate({...fixed,start:655,orders:100,floors:4,runners:1,cartCapacity:50,allowPrestage:true},reference);
 const visits=r.floorEvents.filter(e=>e.kind==='floor');
 assert.equal(visits.filter(e=>e.floor===1).length,2,'the first cart already left before the second batch');
 for(const f of [2,3,4])assert.equal(visits.filter(e=>e.floor===f).length,1,'queued carts should combine both batches');
 assert.equal(visits.reduce((n,e)=>n+e.n,0),100);noOverlap(r);
});
test('cart capacity and resource exclusivity hold across larger staged loads',()=>{
 for(const orders of [200,400]){
  const r=simulate({...defaults,orders,cartCapacity:10,allowPrestage:true,runnerAssist:true},reference);
  assert.equal(r.delivered+r.unserved,r.total);
  assert(r.floorEvents.filter(e=>e.kind==='floor').every(e=>e.n<=10));
  assert(r.deliveries.every(d=>d.t>=(d.place==='T1221'?700:d.place==='Alameda'?720:690)));noOverlap(r);
 }
});
test('a backup arriving before a delivery window consumes waiting time without delaying service',()=>{
 const normal=simulate(fixed,reference),recovered=simulate({...fixed,callout:'courier'},reference);
 assert.deepEqual(recovered.journeys[0].pause,[645,660]);
 assert.deepEqual(recovered.journeys[0].events.filter(e=>e.kind==='drop'),normal.journeys[0].events.filter(e=>e.kind==='drop'));
 assert.equal(recovered.journeys[0].end,normal.journeys[0].end);
});
test('a backup arriving after opening delays only the part beyond the passive wait',()=>{
 const r=simulate({...fixed,callout:'courier',calloutTime:685},reference);
 const drop=r.journeys[0].events.find(e=>e.kind==='drop');
 assert.deepEqual(r.journeys[0].pause,[685,700]);assert.equal(drop.start,700);assert.equal(drop.dep,701);
});
test('recovery interrupts active loading and driving for the actual pause duration',()=>{
 const normal=simulate(fixed,reference);
 for(const calloutTime of [573.5,574.5]){
  const r=simulate({...fixed,callout:'courier',calloutTime},reference),j=r.journeys[0];
  assert.equal(j.pause[1]-j.pause[0],15);
  if(calloutTime===573.5)assert.equal(j.events[0].dep-normal.journeys[0].events[0].dep,15);
  else assert.equal(j.moves[0].end-j.moves[0].start,16);
  noOverlap(r);
 }
});
test('a queued absent courier does not occupy the restaurant loading bay',()=>{
 const c={...fixed,loadingPositions:1,observations:[...observations.filter(o=>o.kind!=='pickup'),observation('pickup',20)]};
 const r=simulate({...c,callout:'courier',failedCourier:4,calloutTime:585},reference);
 const third=r.journeys[2].events.find(e=>e.kind==='pick'),fourth=r.journeys[3].events.find(e=>e.kind==='pick');
 assert.equal(third.start,593);assert(fourth.start>=600);noOverlap(r);
});
test('comparisons at maximum staffing skip unsupported additions without duplicating the baseline',()=>{
 const c={...defaults,activeCouriers:12,runners:12,elevators:6};
 const plans=comparisonPlans(c);assert.equal(plans.length,7);
 const available=plans.filter(p=>p.available);assert.deepEqual(available.map(p=>p.label),['Current plan','Lobby shelf','Stage floors early']);
 assert(plans.filter(p=>!p.available).every(p=>p.reason.includes('maximum')));
 for(const p of available)assert.doesNotThrow(()=>validate(p.config));
 assert.throws(()=>validate({...defaults,elevators:7}));
});
