// Labor cost model. Pay inputs are plan assumptions, not payroll data, and the
// Prop 22 check is a planning screen, not a legal compliance determination.
//
// Prop 22 (Cal. Bus. & Prof. Code §7453) net earnings floor for app-based couriers:
//   120% x applicable minimum wage x engaged hours + per-mile rate x engaged miles.
// Engaged time runs from accepting the request to completing it; the minimum wage
// is the one at the pickup location. Every route here starts at Saucy Asian in
// Emeryville, so the Emeryville rate is the conservative reading.
export const wages={
 oakland:{label:'Oakland',hourly:17.34},
 emeryville:{label:'Emeryville',hourly:20.34},
 state:{label:'California',hourly:16.90},
};
export const PROP22_MULTIPLIER=1.2;
export const PROP22_PER_MILE=0.37; // 2026 rate published by the CA Treasurer
export const costDefaults={longRoutePay:50,firstDowntownPay:35,otherDowntownPay:30,ambassadorRate:30,ambassadorMinutes:90,standbyPay:0,wageCity:'emeryville'};

export function routePay(c,index){
 if(index<2)return c.longRoutePay;
 return index===2?c.firstDowntownPay:c.otherDowntownPay;
}

export function prop22Floor(engagedMinutes,miles,wageCity){
 const hourly=wages[wageCity]?.hourly??wages.state.hourly;
 return PROP22_MULTIPLIER*hourly*engagedMinutes/60+PROP22_PER_MILE*miles;
}

// Cost of one simulated day. Each route is paid the larger of its planned pay
// and the Prop 22 floor, so any shortfall shows up as a top-up.
export function dayCost(result,config){
 const c={...costDefaults,...config};
 const routes=result.journeys.map((j,i)=>{
  const miles=j.moves.reduce((n,m)=>n+(m.mi||0),0);
  const engaged=!j.abandoned&&Number.isFinite(j.end)?j.end-j.start:null;
  // A courier who calls out with no replacement is not paid for the route.
  const planned=j.abandoned?0:routePay(c,i);
  const floor=engaged===null?null:prop22Floor(engaged,miles,c.wageCity);
  const topUp=floor===null?0:Math.max(0,floor-planned);
  return{name:j.name,planned,engaged,miles,floor,topUp,paid:planned+topUp};
 });
 const courier=routes.reduce((n,r)=>n+r.paid,0);
 const ambassadors=(c.runners+c.intakeLeads)*c.ambassadorRate*c.ambassadorMinutes/60;
 const standby=(c.reserveCouriers?c.standbyPay:0);
 const total=courier+ambassadors+standby;
 const topUp=routes.reduce((n,r)=>n+r.topUp,0);
 return{routes,courier,ambassadors,standby,topUp,total,perOrder:total/result.total,belowFloor:topUp>0};
}

export function summarizeCost(costs){
 const n=costs.length,mean=key=>costs.reduce((s,x)=>s+x[key],0)/n;
 const sorted=costs.map(x=>x.total).sort((a,b)=>a-b);
 return{total:mean('total'),perOrder:mean('perOrder'),courier:mean('courier'),ambassadors:mean('ambassadors'),standby:mean('standby'),topUp:mean('topUp'),p95Total:sorted[Math.max(0,Math.ceil(.95*n)-1)],daysBelowFloor:costs.filter(x=>x.belowFloor).length/n};
}
