import {readFileSync} from 'node:fs';
import {createDanfoPassengerState,startDanfoPassengerRoute,processDanfoStop} from '../game-rules/danfo/systems/danfoPassengers.js';
import {cash,dayOf,minuteOf,progress} from './authority.js';
const catalogue=JSON.parse(readFileSync(new URL('../passengers/catalogue.json',import.meta.url),'utf8'));

function routeFor(input){
 const route=catalogue.routes.find(r=>r.id===input.routeId);
 if(!route||typeof input.tripId!=='string'||!/^[a-zA-Z0-9-]{8,100}$/.test(input.tripId))throw Error('Invalid route payment.');
 return route;
}
function configFor(route){return {capacity:route.job==='brt'?48:14,minimumWaitingPerStop:route.job==='brt'?5:2,maximumWaitingPerStop:route.job==='brt'?16:8,baseFare:route.job==='brt'?0:150,farePerStop:route.job==='brt'?0:100,feedbackSeconds:2.4};}
function requireVehicle(route,p){
 const vehicle=String(p?.vehicleId||'');
 if(route.job==='brt'?!vehicle.includes('brt'):!vehicle.includes('danfo'))throw Error('Use the correct vehicle for this route.');
}
function requireStoppedAt(stop,p,message='Fare payment requires stopping at the bus stop.'){
 if(!p||Math.abs(p.speed)>=2||Math.abs(p.x-stop.x-60)>125||Math.abs(p.y-stop.y-60)>125)throw Error(message);
}
function brtSalary(route){
 let distance=0;
 for(let i=1;i<route.stopIds.length;i++){
  const a=catalogue.stops.find(s=>s.id===route.stopIds[i-1]),b=catalogue.stops.find(s=>s.id===route.stopIds[i]);
  distance+=Math.hypot(a.x-b.x,a.y-b.y)/120;
 }
 return Math.min(65000,Math.max(20000,Math.round((9000+distance*575+Math.max(0,route.stopIds.length-2)*175)/100)*100));
}
function markWork(w,route){const day=dayOf(w);w.workDays ||= {};w.workDays[day]=route.job;progress(w,'job-selected');progress(w,'route-selected');return day;}
function applyStopSettlement(w,route,result,day,tripId,index){
 if(result.boardedCount){progress(w,'passenger-boarded',result.boardedCount);progress(w,route.job+'-passenger-boarded',result.boardedCount);}
 if(result.fareEarned){cash(w,result.fareEarned,'PASSENGER FARES');w.state.economyState.totalPassengerFares=(w.state.economyState.totalPassengerFares||0)+result.fareEarned;}
 let agberoPayment=null;
 if(result.boardedCount&&route.job==='danfo'){
  const first=w.agberoDay!==day,amount=first?1000:300;
  cash(w,-amount,first?'AGBERO TICKET':'AGBERO LOADING',false);w.agberoDay=day;w.state.economyState.lastAgberoTicketDay=day;
  agberoPayment={id:tripId+':'+index,amount,reason:first?'owo ticket':'owo loading'};
 }
 return agberoPayment;
}
function completeRoute(w,route){
 progress(w,'route-completed');progress(w,route.job+'-route-completed');if(minuteOf(w)%1440>=1080)progress(w,'night-route-completed');
 if(route.job!=='brt')return 0;
 const salary=brtSalary(route);cash(w,salary,'BRT ROUTE SALARY');return salary;
}

// Compatibility endpoint for saves created before route-level batching.
export function settleTransportStop(w,input){
 const route=routeFor(input),index=input.stopIndex,p=input.serverPose;
 if(!Number.isInteger(index)||index<0||index>=route.stopIds.length)throw Error('Invalid route payment.');
 const stop=catalogue.stops.find(s=>s.id===route.stopIds[index]);
 requireStoppedAt(stop,p);requireVehicle(route,p);
 w.transportReceipts ||= {};
 const receipt=w.transportReceipts[input.tripId];
 if(receipt&&receipt.routeId!==route.id)throw Error('Route payment does not match this journey.');
 if(receipt?.stops.includes(index))return {success:true,alreadyPaid:true};
 if(w.transportLastStop===stop.id&&Date.now()-(w.transportPaidAt||0)<3000)throw Error('This stop payment was just processed.');
 const passengers=createDanfoPassengerState(configFor(route));
 startDanfoPassengerRoute({passengerState:passengers,route,config:configFor(route)});
 let result;
 for(let i=0;i<=index;i++)if(i===index||receipt?.stops.includes(i))result=processDanfoStop({passengerState:passengers,route,stop:catalogue.stops.find(s=>s.id===route.stopIds[i]),stopIndex:i,config:configFor(route)});
 const day=markWork(w,route);
 const agberoPayment=applyStopSettlement(w,route,result,day,input.tripId,index);
 const paid=receipt||{routeId:route.id,stops:[],routeComplete:false};paid.stops.push(index);
 let brtRouteSalary=0;
 if(index===route.stopIds.length-1&&paid.stops.length===route.stopIds.length&&!paid.routeComplete){brtRouteSalary=completeRoute(w,route);paid.routeComplete=true;}
 w.transportReceipts[input.tripId]=paid;w.transportLastStop=stop.id;w.transportPaidAt=Date.now();
 return {success:true,agberoPayment,brtSalary:brtRouteSalary};
}

// Current online transport flow: gameplay and fare feedback happen locally at each
// stop, while the entire route is validated and settled with one server request.
export function settleTransportRoute(w,input){
 const route=routeFor(input),p=input.serverPose;
 const finalStop=catalogue.stops.find(s=>s.id===route.stopIds.at(-1));
 requireStoppedAt(finalStop,p,'Route payment requires finishing at the final bus stop.');requireVehicle(route,p);
 w.transportReceipts ||= {};
 const existing=w.transportReceipts[input.tripId];
 if(existing&&existing.routeId!==route.id)throw Error('Route payment does not match this journey.');
 const alreadyComplete=Boolean(existing?.routeComplete)||(existing?.stops?.length===route.stopIds.length);
 if(alreadyComplete)return {success:true,alreadyPaid:true,fareEarned:0,agberoTotal:0,brtSalary:0};

 const config=configFor(route),passengers=createDanfoPassengerState(config);
 startDanfoPassengerRoute({passengerState:passengers,route,config});
 const paid=existing||{routeId:route.id,stops:[],routeComplete:false};
 const settledStops=new Set(paid.stops||[]),day=markWork(w,route);
 let fareEarned=0,agberoTotal=0,boardedCount=0;
 for(let index=0;index<route.stopIds.length;index++){
  const stop=catalogue.stops.find(s=>s.id===route.stopIds[index]);
  const result=processDanfoStop({passengerState:passengers,route,stop,stopIndex:index,config});
  if(settledStops.has(index))continue;
  const agbero=applyStopSettlement(w,route,result,day,input.tripId,index);
  fareEarned+=result.fareEarned;boardedCount+=result.boardedCount;agberoTotal+=agbero?.amount||0;
  paid.stops.push(index);
 }
 const routeSalary=completeRoute(w,route);paid.routeComplete=true;
 w.transportReceipts[input.tripId]=paid;w.transportLastStop=finalStop.id;w.transportPaidAt=Date.now();
 return {success:true,fareEarned,agberoTotal,boardedCount,brtSalary:routeSalary};
}
