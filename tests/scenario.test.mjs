import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/engine.mjs';
import {createScenarioLink,readScenario,scenarioAddress} from '../src/scenario.mjs';

const hash='a1b2c3d4e5f6'+'0'.repeat(52);
const base='https://1221-broadway.vercel.app/';
const state={config:{...defaults,orders:240,runners:4,elevators:2,callout:'courier',failedCourier:3,reserveCouriers:0,localBackup:false,seed:54321,runs:250,runnerAssist:true,cutoff:630},clock:703.125,view:'bay',speed:12};

test('scenario fragments restore all plan inputs, seed, run count and playback',()=>{
 const link=createScenarioLink(base,hash,state),url=new URL(link);
 assert.equal(url.search,'');assert.match(url.pathname,/\/scenarios\/a1b2c3d4e5f6\/index\.html$/);
 assert.deepEqual(readScenario(link,hash),state);
});
test('frozen defaults round trip without being repeated in the fragment',()=>{
 const original={config:{...defaults},clock:570,view:'auto',speed:6};
 const link=createScenarioLink(base,hash,original);
 assert.deepEqual(readScenario(link,hash),original);
 assert(!link.includes('activeCouriers='));assert(link.includes('seed=1221'));assert(link.includes('runs=500'));
});
test('links preserve a local build root and do not nest snapshot directories',()=>{
 const local='file:///workspace/dist/index.html';
 assert.equal(scenarioAddress(local,hash).href,'file:///workspace/dist/scenarios/a1b2c3d4e5f6/index.html');
 assert.equal(scenarioAddress(createScenarioLink(base,hash,state),hash).href,scenarioAddress(base,hash).href);
});
test('ordinary anchors are not interpreted as scenarios',()=>{
 assert.equal(readScenario(base+'#methodology',hash),null);
});
test('corrupt, ambiguous, oversized and wrong-version links are rejected',()=>{
 const link=createScenarioLink(base,hash,state);
 for(const suffix of ['&orders=-1','&constructor=oops','&seed=5','&orders=100000','&extra='+('x'.repeat(4100))])assert.throws(()=>readScenario(link+suffix,hash));
 assert.throws(()=>readScenario(link,hash.replace(/^a/,'b')));
 assert.throws(()=>readScenario(link.replace('scenario=1','scenario=2'),hash));
 assert.throws(()=>readScenario(link.replace(/seed=\d+&?/,''),hash));
 assert.throws(()=>readScenario(link.replace('t=703.125','t=NaN'),hash));
});
test('sharing cannot silently omit observations or non-default hidden inputs',()=>{
 assert.throws(()=>createScenarioLink(base,hash,{...state,config:{...state.config,observations:[{evidence:'observed'}]}}));
 assert.throws(()=>createScenarioLink(base,hash,{...state,config:{...state.config,cartCapacity:30}}));
});
