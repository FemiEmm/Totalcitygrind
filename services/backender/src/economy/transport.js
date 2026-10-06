import {readFileSync} from 'node:fs';
import {createDanfoPassengerState,startDanfoPassengerRoute,processDanfoStop} from '../game-rules/danfo/systems/danfoPassengers.js';
import {cash,dayOf,minuteOf,progress} from './authority.js';
const catalogue=JSON.parse(readFileSync(new URL('../passengers/catalogue.json',import.meta.url),'utf8'));
// Only payment receipts are retained: no shared NPCs, waiting pools, or redistribution.
export function settleTransportStop(w,input){
 const route=catalogue.routes.find(r=>r.id===input.routeId),index=input.stopIndex,p=input.serverPose;
 if(!route||!Number.isInteger(index)||index<0||index>=route.stopIds.length||typeof input.tripId!=='string'||!/^[a-zA-Z0-9-]{8,100}$/.test(input.tripId))throw Error('Invalid route payment.');
 const stop=catalogue.stops.find(s=>s.id===route.stopIds[index]);
 if(!p||Math.abs(p.speed)>=2||Math.abs(p.x-stop.x-60)>125||Math.abs(p.y-stop.y-60)>125)throw Error('Fare payment requires stopping at the bus stop.');
 const vehicle=String(p.vehicleId||'');
 if(route.job==='brt'?!vehicle.includes('brt'):!vehicle.includes('danfo'))throw Error('Use the correct vehicle for this route.');
 w.transportReceipts ||= {};
 const receipt=w.transportReceipts[input.tripId];
 if(receipt&&receipt.routeId!==route.id)throw Error('Route payment does not match this journey.');
 if(receipt?.stops.includes(index))return {success:true,alreadyPaid:true};
 if(index!==(receipt?.stops.length||0))throw Error('A previous route payment was not confirmed. Start a new route when connected.');
 // Limit repeated claims from different journey IDs at the same stop.
 if(w.transportLastStop===stop.id&&Date.now()-(w.transportPaidAt||0)<3000)throw Error('This stop payment was just processed.');
 const config={capacity:route.job==='brt'?48:14,minimumWaitingPerStop:route.job==='brt'?5:2,maximumWaitingPerStop:route.job==='brt'?16:8,baseFare:route.job==='brt'?0:150,farePerStop:route.job==='brt'?0:100,feedbackSeconds:2.4};
 const passengers=createDanfoPassengerState(config);
 startDanfoPassengerRoute({passengerState:passengers,route,config});
 let result;
 for(let i=0;i<=index;i++)result=processDanfoStop({passengerState:passengers,route,stop:catalogue.stops.find(s=>s.id===route.stopIds[i]),stopIndex:i,config});
 const day=dayOf(w);w.workDays ||= {};w.workDays[day]=route.job;
 progress(w,'job-selected');progress(w,'route-selected');
 if(result.boardedCount){progress(w,'passenger-boarded',result.boardedCount);progress(w,route.job+'-passenger-boarded',result.boardedCount);}
 if(result.fareEarned){cash(w,result.fareEarned,'PASSENGER FARES');w.state.economyState.totalPassengerFares=(w.state.economyState.totalPassengerFares||0)+result.fareEarned;}
 let agberoPayment=null;
 if(result.boardedCount&&route.job==='danfo'){
  const first=w.agberoDay!==day,amount=first?1000:300;
  cash(w,-amount,first?'AGBERO TICKET':'AGBERO LOADING',false);w.agberoDay=day;w.state.economyState.lastAgberoTicketDay=day;
  agberoPayment={amount,reason:first?'owo ticket':'owo loading'};
 }
 const paid=receipt||{routeId:route.id,stops:[]};paid.stops.push(index);w.transportReceipts[input.tripId]=paid;
 w.transportLastStop=stop.id;w.transportPaidAt=Date.now();
 if(index===route.stopIds.length-1&&paid.stops.length===route.stopIds.length){
  progress(w,'route-completed');progress(w,route.job+'-route-completed');if(minuteOf(w)%1440>=1080)progress(w,'night-route-completed');
  if(route.job==='brt'){
   let distance=0;for(let i=1;i<route.stopIds.length;i++){const a=catalogue.stops.find(s=>s.id===route.stopIds[i-1]),b=catalogue.stops.find(s=>s.id===route.stopIds[i]);distance+=Math.hypot(a.x-b.x,a.y-b.y)/120;}
   cash(w,Math.min(65000,Math.max(20000,Math.round((9000+distance*575+Math.max(0,route.stopIds.length-2)*175)/100)*100)),'BRT ROUTE SALARY');
  }
 }
 return {success:true,agberoPayment};
}
