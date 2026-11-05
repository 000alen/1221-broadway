import {defaults,validate} from './engine.mjs';

// A fragment contains only plan inputs. Model code and its defaults are frozen
// at the public /scenarios/<fingerprint>/ address, never supplied by the URL.
const ranges={
  activeCouriers:[1,12],reserveCouriers:[0,1],runners:[1,12],
  orders:[10,1000],capacity:[20,300],floors:[1,30],elevators:[1,6],
  failedCourier:[1,4],backupResponse:[0,60],seed:[0,2147483647],runs:[1,2000],
  longRoutePay:[0,1000],firstDowntownPay:[0,1000],otherDowntownPay:[0,1000],standbyPay:[0,1000],ambassadorRate:[0,1000],ambassadorMinutes:[0,600],
};
const flags=['localBackup','allowPrestage','runnerAssist'];
const choices={wageCity:['emeryville','oakland','state'],towerMode:['floors','lobby'],callout:['none','courier','ambassador','both'],kitchenDelay:[0,1,2],trafficScale:[1,1.25,1.5]};
const keys=[...Object.keys(ranges),...flags,...Object.keys(choices),'cutoff'];
const controls=new Set(keys);
const metadata=new Set(['scenario','model','t','view','speed']);
const fingerprint=hash=>hash.slice(0,12);

function valueFor(key,value){
  if(flags.includes(key)){
    if(value!=='1'&&value!=='0')throw Error('A scenario setting is invalid.');
    return value==='1';
  }
  if(key==='cutoff'){
    if(value==='none')return null;
    if(!['555','630','640'].includes(value))throw Error('The order cutoff in this link is not supported.');
    return Number(value);
  }
  if(Object.hasOwn(ranges,key)){
    if(!/^\d+$/.test(value))throw Error('A scenario number is invalid.');
    const n=Number(value),[min,max]=ranges[key];
    if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('A scenario number is outside the supported range.');
    return n;
  }
  const allowed=choices[key],sample=allowed[0],parsed=typeof sample==='number'?Number(value):value;
  if(value===''||!allowed.includes(parsed))throw Error('A scenario setting is not supported.');
  return parsed;
}

export function readScenario(href,modelHash){
  const url=new URL(href),params=new URLSearchParams(url.hash.slice(1));
  if(!params.has('scenario'))return null;
  if(url.hash.length>4096)throw Error('This scenario link is too long to open.');
  for(const key of params.keys()){
    if(params.getAll(key).length!==1||(!controls.has(key)&&!metadata.has(key)))throw Error('This scenario link contains an unrecognized setting.');
  }
  if(params.get('scenario')!=='1')throw Error('This scenario link uses an unsupported format.');
  if(params.get('model')!==fingerprint(modelHash))throw Error('This link belongs to another model version. Open the original scenario address.');
  for(const key of ['seed','runs','t','view','speed'])if(!params.has(key))throw Error('This scenario link is incomplete.');
  const config={...defaults,observations:[]};
  for(const key of keys)if(params.has(key))config[key]=valueFor(key,params.get(key));
  validate(config);
  const clock=Number(params.get('t')),view=params.get('view'),speed=Number(params.get('speed'));
  if(params.get('t')===''||!Number.isFinite(clock)||clock<570||clock>10080||!['auto','oak','bay'].includes(view)||![3,6,12].includes(speed))throw Error('The playback position in this link is invalid.');
  return {config,clock,view,speed};
}

export function scenarioAddress(href,modelHash){
  const url=new URL(href);
  // Also works for the standalone build opened from disk.
  const root=url.pathname.replace(/scenarios\/[a-f0-9]{12}\/(?:index\.html)?$/,'').replace(/[^/]*$/,'');
  url.pathname=`${root}scenarios/${fingerprint(modelHash)}/index.html`;
  url.search='';url.hash='';
  return url;
}

export function createScenarioLink(href,modelHash,{config,clock,view,speed}){
  const url=scenarioAddress(href,modelHash),params=new URLSearchParams({scenario:'1',model:fingerprint(modelHash)});
  // Non-exposed inputs must remain the frozen model defaults. Do not silently
  // drop observations or a programmatically modified model parameter.
  for(const [key,value] of Object.entries(config)){
    if(key==='observations'){if(value.length)throw Error('This plan contains observations that cannot be included in a public link.');}
    else if(!controls.has(key)&&value!==defaults[key])throw Error('This plan contains a setting that cannot be shared.');
  }
  for(const key of keys){
    const value=config[key];
    if(key==='seed'||key==='runs'||value!==defaults[key]){
      const encoded=typeof value==='boolean'?(value?'1':'0'):value===null?'none':String(value);
      valueFor(key,encoded);params.set(key,encoded);
    }
  }
  params.set('t',String(Math.round(clock*1000)/1000));params.set('view',view);params.set('speed',String(speed));
  url.hash=params.toString();
  readScenario(url.href,modelHash);
  return url.href;
}
