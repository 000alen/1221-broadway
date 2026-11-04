import {simulate,summarize,validate,limits} from './engine.mjs';
export function comparisonPlans(config){
 const variants=[['Current plan',{}],['One more runner',{runners:config.runners+1}],['One more elevator',{elevators:config.elevators+1}],['Runner + elevator',{runners:config.runners+1,elevators:config.elevators+1}],['One more courier',{activeCouriers:config.activeCouriers+1}],['Lobby shelf',{towerMode:'lobby'}],['Stage floors early',{allowPrestage:true}]];
 return variants.map(([label,change])=>{
  const candidate={...config,...change};
  try{validate(candidate);return{label,config:candidate,available:true};}
  catch(error){
   const names={runners:'tower runners',elevators:'elevators',activeCouriers:'couriers'};
   const exceeded=Object.entries(limits).filter(([key,max])=>candidate[key]>max);
   const reason=exceeded.length?`Already at the maximum: ${exceeded.map(([key,max])=>`${max} ${names[key]||key}`).join(', ')}.`:error.message;
   return{label,available:false,reason};
  }
 });
}
if(typeof self!=='undefined')self.onmessage=({data})=>{try{
 const {config,reference,mode='base'}=data;
 const sweep=(c,count)=>{const runs=[];let representative=null;for(let i=0;i<count;i++){const r=simulate(c,reference,c.seed+i*7919);if(i===0)representative=r;runs.push({allOnTime:r.allOnTime,completion:r.completion,towerCompletion:r.towerCompletion,lateOrders:r.lateOrders,unserved:r.unserved,pickupMinutes:r.pickupMinutes,queueMinutes:r.queueMinutes});if(mode==='base'&&i%25===0)self.postMessage({type:'progress',value:i/count});}return{summary:summarize(runs),representative};};
 if(mode==='base'){const result=sweep(config,config.runs);self.postMessage({type:'result',...result});}
 else {const variants=comparisonPlans(config);const results=[];for(let i=0;i<variants.length;i++){const variant=variants[i];results.push(variant.available?{label:variant.label,available:true,...sweep(variant.config,Math.min(config.runs,250)).summary}:variant);self.postMessage({type:'progress',value:(i+1)/variants.length});}self.postMessage({type:'sensitivity',results});}
}catch(error){self.postMessage({type:'error',message:error.message});}};
