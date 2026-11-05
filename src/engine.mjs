import returnRoutes from '../data/return-routes.json' with {type:'json'};
import {priors} from './priors.mjs';
import {costDefaults,wages} from './cost.mjs';
// Seeded, event-driven operations model. Minutes are minutes after midnight.
export const VERSION='2.2.0';
export const limits={activeCouriers:12,runners:12,elevators:6,orders:1000,floors:30};
export const names={Saucy:'Saucy Asian',Adeline:'Adeline',Wise:'Wise Sons',Kitava:'Kitava',SqPie:'Square Pie Guys',Concord:'Concord Tech Center',WFConcord:'WF Concord',SL:'WF San Leandro',Alameda:'Science Alameda',T1221:'1221 Broadway',CK:'Credit Karma'};
export const colors=['#2F6E5A','#C98A12','#F74C25','#8C2A12','#66549b','#277e99','#9d4f78','#6b762e'];
export const defaults={...costDefaults,activeCouriers:4,reserveCouriers:1,runners:3,localBackup:true,intakeLeads:1,elevators:1,orders:200,capacity:125,cartCapacity:25,floors:16,towerMode:'floors',start:570,cutoff:null,prep:15,loadingPositions:1,pickupScale:1,trafficScale:1,trafficCorrelation:.6,kitchenDelay:1,callout:'none',failedCourier:1,calloutTime:645,ambassadorTime:660,backupResponse:11,transfer:6,runnerAssist:false,allowPrestage:false,seed:1221,runs:500,observations:[]};
export function rng(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=Math.imul(x^x>>>15,1|x);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function triangular(u,a,m,b){if(a===b)return a;const k=(m-a)/(b-a);return u<k?a+Math.sqrt(u*(b-a)*(m-a)):b-Math.sqrt((1-u)*(b-a)*(b-m));}
const normal=(random)=>Math.sqrt(-2*Math.log(Math.max(1e-12,random())))*Math.cos(2*Math.PI*random());
function phi(x){const t=1/(1+.2316419*Math.abs(x));const d=.3989422804*Math.exp(-x*x/2);const p=1-d*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return x>=0?p:1-p;}
export function validate(c){for(const key of ['start','calloutTime','ambassadorTime','seed'])if(!Number.isFinite(c[key])||c[key]<0||c[key]>2147483647)throw Error(`Invalid ${key}`);if(!['none','courier','ambassador','both'].includes(c.callout)||!['lobby','floors'].includes(c.towerMode))throw Error('Invalid operating policy');if(!Number.isInteger(c.reserveCouriers)||c.reserveCouriers<0||c.reserveCouriers>1)throw Error('Reserve couriers must be zero or one');for(const key of ['activeCouriers','runners','intakeLeads','elevators','capacity','cartCapacity','floors','orders','loadingPositions'])if(!Number.isInteger(c[key])||c[key]<1)throw Error(`${key} must be a positive integer`);if(c.runs<1||c.runs>2000||!Number.isInteger(c.runs)||c.trafficCorrelation<0||c.trafficCorrelation>1)throw Error('Invalid run count or traffic correlation');if(c.trafficScale<=0||c.pickupScale<=0)throw Error('Timing multipliers must be positive');for(const [key,max] of Object.entries(limits))if(c[key]>max)throw Error(`${key} exceeds the supported maximum of ${max}`);if(c.capacity<20)throw Error('Vehicle capacity must be at least 20 meals');for(const key of ['pickupScale','trafficScale','backupResponse','transfer','kitchenDelay','prep'])if(!Number.isFinite(c[key])||c[key]<0)throw Error(`${key} must be nonnegative`);for(const key of ['longRoutePay','firstDowntownPay','otherDowntownPay','ambassadorRate','ambassadorMinutes','standbyPay'])if(!Number.isFinite(c[key])||c[key]<0||c[key]>1000)throw Error(`${key} must be between 0 and 1000`);if(!Object.hasOwn(wages,c.wageCity))throw Error('Invalid minimum-wage city');if(c.cutoff!==null&&(!Number.isFinite(c.cutoff)||c.cutoff<0))throw Error('Invalid order cutoff');return c;}
export function evidence(c){const obs=(c.observations||[]).filter(r=>r.evidence==='observed');const warnings=[];if(c.cutoff===null)warnings.push('Order cutoff and restaurant release policy are unconfirmed.');if(c.towerMode==='floors')warnings.push('Floor allocation, elevator configuration and runner workflow are planning assumptions.');for(const kind of ['pickup','travel','intake',c.towerMode==='floors'?'floor':'shelf']){const n=obs.filter(r=>r.kind===kind).length;if(!n)warnings.push(`No observed ${kind} timings; using explicit planning priors.`);else if(n<30)warnings.push(`Only ${n} observed ${kind} timings; tail estimates may be unstable.`);}warnings.push('Restaurant-to-building order mix is assumed evenly spread across five kitchens.');return{observed:obs.length,status:'Conditional planning estimate',warnings};}
class Timeline{events=[];id=0;now=0;add(t,fn){if(Number.isFinite(t))this.events.push({t,id:this.id++,fn});}run(){let guard=0;while(this.events.length){this.events.sort((a,b)=>a.t-b.t||a.id-b.id);const e=this.events.shift();this.now=e.t;e.fn();if(++guard>30000)throw Error('Simulation event limit exceeded');}}}
class Resource{constructor(n,clock,id,log){this.free=Array.from({length:n},(_,i)=>i);this.queue=[];this.clock=clock;this.id=id;this.log=log;}request(ready,fn){this.clock.add(ready,()=>{if(this.free.length)this.start(this.free.shift(),ready,fn);else this.queue.push({ready,fn});});}start(slot,ready,fn){const start=this.clock.now;let released=false;fn(start,()=>{if(released)throw Error('Resource released twice');released=true;this.log.push({resource:this.id,slot,start,end:this.clock.now});const next=this.queue.shift();if(next)this.start(slot,next.ready,next.fn);else this.free.push(slot);},slot,start-ready);}}
function sample(c,random,kind,key,a,m,b,orders){const rows=(c.observations||[]).filter(r=>r.evidence==='observed'&&r.kind===kind&&(r.key===key||r.key==='*')&&(!orders||!r.orders||Math.abs(r.orders-orders)/Math.max(1,orders)<=.25));if(rows.length)return rows[Math.floor(random()*rows.length)].minutes;return triangular(random(),a,m,b);}
function leg(reference,from,to,alt){const k=from==='Concord'?'ConcordTech>WFConcord':`${from}>${to}`;const options=reference.legs[k];if(!options)return null;return options.find(x=>x.id===alt)||options[0];}
export function simulate(config,reference,runSeed=config.seed){
 const c=validate({...defaults,...config}),random=rng(runSeed),clock=new Timeline(),resourceLog=[];
 const dayTraffic=normal(random),dayKitchen=triangular(random(),...priors.dayKitchen.range)*c.kitchenDelay;
 const loading=Object.fromEntries(['Saucy','Adeline','Wise','Kitava','SqPie'].map(k=>[k,new Resource(c.loadingPositions,clock,`loading:${k}`,resourceLog)]));
 const driverPool=new Resource(c.activeCouriers,clock,'courier',resourceLog),intake=new Resource(c.intakeLeads,clock,'intake',resourceLog),runnerPool=new Resource(c.runners,clock,'runner',resourceLog),elevator=new Resource(c.elevators,clock,'elevator',resourceLog);
 const result={seed:runSeed,config:c,journeys:[],deliveries:[],messages:[],resourceLog,floorEvents:[],total:c.orders+50,lateOrders:0,delivered:0,completion:Infinity,towerCompletion:Infinity,queueMinutes:0,pickupMinutes:[],unserved:0,version:VERSION};
 const windows={Concord:[690,720],WFConcord:[690,720],SL:[690,720],CK:[690,720],Alameda:[720,750],T1221:[700,720]};
 const towerVehicles=Math.max(2,1+Math.ceil(Math.max(0,c.orders-(c.capacity-10))/c.capacity));
 const first=Math.min(c.capacity-10,Math.ceil(c.orders/towerVehicles)),rest=c.orders-first;
 const towerLoads=[first,...Array.from({length:towerVehicles-1},(_,i)=>Math.floor(rest/(towerVehicles-1))+(i<rest%(towerVehicles-1)?1:0))];
 const plans=[{name:'Concord',start:3,drops:[['Concord',10],['WFConcord',10]]},{name:'San Leandro and Alameda',start:19,drops:[['SL',10],['Alameda',10]]},...towerLoads.map((n,i)=>({name:i===0?'Downtown, first car':i===1?'Downtown, second car':`Downtown, car ${i+1}`,start:i===0?15:14+i-1,drops:i===0?[['T1221',n],['CK',10]]:[['T1221',n]]}))];
 const message=(t,text)=>result.messages.push({t,text});
 const deliver=(place,n,t,route,floor=null)=>{result.delivered+=n;if(t>windows[place][1]+1e-7)result.lateOrders+=n;result.deliveries.push({place,n,t,deadline:windows[place][1],route,floor});};
 let unavailableRunner=false,backupRunnerArrived=false;
 if(c.callout==='ambassador'||c.callout==='both'){clock.add(c.ambassadorTime,()=>{unavailableRunner=true;message(clock.now,'One tower runner calls out.');if(c.localBackup)clock.add(clock.now+c.backupResponse,()=>{backupRunnerArrived=true;message(clock.now,'Local runner replacement arrives.');});});}
 // Reserve one runner's slot until replacement arrival, rather than reducing another role.
 if(c.callout==='ambassador'||c.callout==='both'){runnerPool.request(c.ambassadorTime,(start,release)=>{if(c.localBackup)clock.add(start+c.backupResponse,release);});}
 let runnerAssistantReleased=false;
 const pendingFloors=Array(c.floors).fill(0),queuedFloors=Array(c.floors).fill(false);
 function towerBatch(n,t,route){
  intake.request(t,(start,release,slot,wait)=>{
   result.queueMinutes+=wait;const duration=sample(c,random,'intake','T1221',...priors.intake.range,n);const end=start+duration;
   result.floorEvents.push({kind:'intake',start,end,n});clock.add(end,()=>{release();
    if(c.towerMode==='lobby'){
     runnerPool.request(Math.max(end,700),(at,free,r,queue)=>{result.queueMinutes+=queue;const service=sample(c,random,'shelf','T1221',...priors.floor.range)*n;result.floorEvents.push({kind:'shelf',start:at,end:at+service,n});clock.add(at+service,()=>{deliver('T1221',n,clock.now,route);free();});});return;
    }
    const base=Math.floor(n/c.floors),extra=n%c.floors;for(let f=0;f<c.floors;f++)pendingFloors[f]+=base+Number(f<extra);
    for(let f=0;f<c.floors;f++)dispatchFloor(f);
   });
  });
 }
 function dispatchFloor(f){
  if(queuedFloors[f]||!pendingFloors[f])return;
  queuedFloors[f]=true;
  const ready=Math.max(clock.now,c.allowPrestage?680:700);
  runnerPool.request(ready,(start,releaseRunner,r,wait)=>{
   // Claim meals only when a runner can actually leave. Later arriving batches
   // merge into queued work instead of creating another pre-booked floor visit.
   queuedFloors[f]=false;
   const task={floor:f+1,n:Math.min(c.cartCapacity,pendingFloors[f]),route:'tower'};
   pendingFloors[f]-=task.n;
   if(pendingFloors[f])dispatchFloor(f);
   result.queueMinutes+=wait;
   const ride=()=>{const measured=(c.observations||[]).filter(r=>r.evidence==='observed'&&r.kind==='elevator'&&(r.key===String(task.floor)||r.key==='*'));return measured.length?measured[Math.floor(random()*measured.length)].minutes:sample(c,random,'elevator-overhead',String(task.floor),...priors.elevatorOverhead.range)+task.floor*3.8/(triangular(random(),...priors.elevatorSpeed.range)*60);};
   elevator.request(start,(liftStart,releaseLift,lift,queue)=>{
    result.queueMinutes+=queue;const up=ride();result.floorEvents.push({kind:'lift-up',start:liftStart,end:liftStart+up,floor:task.floor,n:task.n});
    clock.add(liftStart+up,()=>{releaseLift();const at=clock.now;const service=sample(c,random,'floor','T1221',...priors.floor.range)*task.n+sample(c,random,'floor-setup','T1221',...priors.floorSetup.range);
     result.floorEvents.push({kind:'floor',start:at,end:at+service,floor:task.floor,n:task.n});clock.add(at+service,()=>{
      // Placement may finish before opening. Availability waits until 11:40;
      // the runner and elevator do not wait upstairs for the window to open.
      clock.add(Math.max(clock.now,700),()=>deliver('T1221',task.n,clock.now,task.route,task.floor));
      elevator.request(clock.now,(downStart,releaseDown,lift,queue)=>{result.queueMinutes+=queue;const down=ride();result.floorEvents.push({kind:'lift-down',start:downStart,end:downStart+down,floor:task.floor,n:0});clock.add(downStart+down,()=>{releaseDown();releaseRunner();});});
     });
    });
   });
  });
 }
 plans.forEach((plan,index)=>{
  const load=plan.drops.reduce((n,[,count])=>n+count,0);if(load>c.capacity)throw Error('Vehicle capacity exceeded');
  const j={id:`C${index+1}`,name:plan.name,color:colors[index%colors.length],start:c.start+plan.start,end:Infinity,moves:[],events:[],load,abandoned:false,pause:null};result.journeys.push(j);
  driverPool.request(j.start,(started,release,driver,queue)=>{
   j.driver=driver;j.start=started;result.queueMinutes+=queue;let aborted=false,pauseEnd=-Infinity,loadingRelease=null;
   const failed=(c.callout==='courier'||c.callout==='both')&&index===c.failedCourier-1;
   if(failed)clock.add(Math.max(started,c.calloutTime),()=>{
    if(Number.isFinite(j.end))return;
    if(c.reserveCouriers<1){aborted=true;j.abandoned=true;j.pause=[clock.now,Infinity];if(loadingRelease){loadingRelease();loadingRelease=null;}message(clock.now,`${j.id} unavailable: ${load} orders require rescue.`);return;}
    const response=sample(c,random,'backup','courier',c.backupResponse*.7,c.backupResponse,c.backupResponse*1.6),transfer=sample(c,random,'handoff','courier',c.transfer*.6,c.transfer,c.transfer*1.5);pauseEnd=clock.now+response+transfer;j.pause=[clock.now,pauseEnd];message(clock.now,`${j.id} calls out; reserve response and load transfer begin.`);clock.add(pauseEnd,()=>message(clock.now,`Reserve takes over ${j.id}.`));
   });
   function schedule(end,fn,activeStart=clock.now,onShift=()=>{}){
    let shifted=false;
    const complete=()=>{
     if(aborted)return;
     if(!shifted&&j.pause&&end>j.pause[0]){
      const delay=Math.max(0,j.pause[1]-Math.max(activeStart,j.pause[0]));
      if(delay){shifted=true;onShift();clock.add(end+delay,complete);return;}
     }
     fn();
    };
    clock.add(end,complete);
   }
   function drive(from,to,done){if(aborted)return;const info=leg(reference,from,to,index===3&&from==='Kitava'?'b':index===1&&from==='SL'?'b':'a');if(!info)throw Error(`Missing road ${from}>${to}`);
    const u=phi(Math.sqrt(c.trafficCorrelation)*dayTraffic+Math.sqrt(1-c.trafficCorrelation)*normal(random));const [a,b]=info.g;
    const observed=(c.observations||[]).filter(r=>r.evidence==='observed'&&r.kind==='travel'&&r.key===`${from}>${to}`);
    const duration=(observed.length?observed[Math.floor(random()*observed.length)].minutes:triangular(u,a,(a+b)/2,b))*c.trafficScale;
    const m={from,to,start:clock.now,end:clock.now+duration,geometry:info.geo,duration,mi:info.mi||0};j.moves.push(m);schedule(m.end,()=>{m.end=clock.now;m.pause=j.pause;done();});
   }
   function pickup(i){if(i===5){drop(0,'SqPie');return;}const key=['Saucy','Adeline','Wise','Kitava','SqPie'][i],arrive=clock.now,pickupMeals=Math.floor(load/5)+Number(i<load%5);
    const ready=Math.max(c.start,c.cutoff===null?c.start:c.cutoff+c.prep)+dayKitchen+sample(c,random,'ready',key,...priors.ready.range)*c.kitchenDelay;
    const requestLoading=()=>loading[key].request(Math.max(clock.now,arrive,ready,pauseEnd),(start,free,bay,wait)=>{
     if(aborted){free();return;}loadingRelease=free;result.queueMinutes+=start-arrive;
     if(start<pauseEnd){loadingRelease=null;free();clock.add(pauseEnd,requestLoading);result.queueMinutes-=start-arrive;return;}
     const fallback=sample(c,random,'pickup-setup',key,...priors.pickupSetup.range)+sample(c,random,'pickup-per-order',key,...priors.pickupPerOrder.range)*pickupMeals;
     const duration=sample(c,random,'pickup',key,fallback,fallback,fallback,pickupMeals)*c.pickupScale;
     const event={kind:'pick',place:key,arr:arrive,start,dep:start+duration,n:pickupMeals};j.events.push(event);
     schedule(event.dep,()=>{event.dep=clock.now;result.pickupMinutes.push({key,service:duration,wait:start-arrive,total:clock.now-arrive,orders:event.n});free();loadingRelease=null;if(i<4)drive(key,['Adeline','Wise','Kitava','SqPie'][i],()=>pickup(i+1));else pickup(5);});
    });
    requestLoading();
   }
   function drop(i,from){if(i===plan.drops.length){j.end=clock.now;message(clock.now,`${j.id} completes its delivery route.`);if(c.runnerAssist&&index===3&&!runnerAssistantReleased){runnerAssistantReleased=true;runnerPool.free.push(c.runners);const next=runnerPool.queue.shift();if(next)runnerPool.start(runnerPool.free.pop(),next.ready,next.fn);message(clock.now,'Courier 4 becomes an additional tower runner.');return;}const endpoint=plan.drops.at(-1)[0],back=returnRoutes.find(r=>r.from===endpoint);const returnMinutes=(back?triangular(random(),back.minutes,back.minutes*1.3,back.minutes*1.8):35)*c.trafficScale;j.returnEnd=clock.now+returnMinutes;clock.add(j.returnEnd,release);return;}
    const [place,n]=plan.drops[i];drive(from,place,()=>{const arrive=clock.now,start=place==='T1221'?arrive:Math.max(arrive,windows[place][0]);const service=sample(c,random,place==='T1221'?'handoff':'drop',place,...priors.drop.range)+n*sample(c,random,'drop-per-order',place,...priors.dropPerOrder.range);
     const e={kind:'drop',place,arr:arrive,start,dep:start+service,n};j.events.push(e);schedule(e.dep,()=>{e.dep=clock.now;if(place==='T1221')towerBatch(n,clock.now,j.id);else deliver(place,n,clock.now,j.id);drop(i+1,place);},start,()=>{if(j.pause[0]<=e.start)e.start=Math.max(e.start,j.pause[1]);});
    });
   }
   pickup(0);
  });
 });
 clock.run();result.messages.sort((a,b)=>a.t-b.t);result.deliveries.sort((a,b)=>a.t-b.t);result.unserved=result.total-result.delivered;
 result.completion=result.unserved?Infinity:Math.max(...result.deliveries.map(d=>d.t));
 const tower=result.deliveries.filter(d=>d.place==='T1221');result.towerCompletion=tower.reduce((n,d)=>n+d.n,0)===c.orders?Math.max(...tower.map(d=>d.t)):Infinity;
 result.onTimeOrders=result.delivered-result.lateOrders;result.allOnTime=result.onTimeOrders===result.total;return result;
}
export function atTime(result,t){return{delivered:result.deliveries.filter(d=>d.t<=t).reduce((n,d)=>n+d.n,0),tower:result.deliveries.filter(d=>d.place==='T1221'&&d.t<=t).reduce((n,d)=>n+d.n,0)};}
export function quantile(values,p){const a=values.slice().sort((a,b)=>a-b);return a.length?a[Math.max(0,Math.ceil(p*a.length)-1)]:null;}
export function summarize(runs){const count=runs.length,success=runs.filter(r=>r.allOnTime).length,p=success/count,z=1.96,denom=1+z*z/count,center=(p+z*z/(2*count))/denom,half=z*Math.sqrt(p*(1-p)/count+z*z/(4*count*count))/denom;return{runs:count,success,probability:p,interval:[Math.max(0,center-half),Math.min(1,center+half)],p50:quantile(runs.map(r=>r.completion),.5),p95:quantile(runs.map(r=>r.completion),.95),towerP50:quantile(runs.map(r=>r.towerCompletion),.5),towerP95:quantile(runs.map(r=>r.towerCompletion),.95),meanLate:runs.reduce((n,r)=>n+r.lateOrders+r.unserved,0)/count,pickupP50:quantile(runs.flatMap(r=>r.pickupMinutes.map(x=>x.total)),.5),pickupP95:quantile(runs.flatMap(r=>r.pickupMinutes.map(x=>x.total)),.95),meanQueue:runs.reduce((n,r)=>n+r.queueMinutes,0)/count};}
