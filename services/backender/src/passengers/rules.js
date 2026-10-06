// Shared by the game and Backender. Time is expressed in game minutes.
export const PASSENGER_TOTAL = 1000;
export const BOARD_SECONDS = 3;
export const REST_MINUTES = 120;
function destination(stop, catalogue, seed) {
 const options=[...new Set(catalogue.routes.flatMap(r=>{const i=r.stopIds.indexOf(stop);return i<0?[]:r.stopIds.slice(i+1);} ))];
 const choices=options.length?options:catalogue.stops.map(s=>s.id).filter(id=>id!==stop);
 return choices[seed%choices.length];
}
export function createPassengerPool(catalogue, minute=0) {
 const baseline=Object.fromEntries(catalogue.stops.map(s=>[s.id,0]));
 const npcs=Array.from({length:PASSENGER_TOTAL},(_,id)=>{const stop=catalogue.stops[id%catalogue.stops.length].id;baseline[stop]++;return {id,stop,destination:destination(stop,catalogue,Math.floor(id/catalogue.stops.length)),vehicle:null,readyAt:minute,fare:0};});
 return {version:1,npcs,baseline,sessions:{},lastHour:Math.floor(minute/60)};
}
function release(pool,id,minute) {
 const s=pool.sessions[id];
 for(const n of pool.npcs)if(n.vehicle===id){n.vehicle=null;n.stop=s?.lastStop||n.stop;n.readyAt=minute+REST_MINUTES;n.destination=null;n.fare=0;}
 if(s)s.closed=true;
}
export function advancePassengerPool(pool,catalogue,minute) {
 const hour=Math.floor(minute/60);if(hour<=pool.lastHour)return;
 // Empty abandoned vehicles after one game day; no fare is awarded.
 for(const [id,s] of Object.entries(pool.sessions))if(!s.closed&&minute-s.seen>1440)release(pool,id,minute);
 for(const n of pool.npcs)if(!n.vehicle&&n.readyAt<=minute&&!n.destination)n.destination=destination(n.stop,catalogue,n.id+hour);
 // At most 1,000 catch-up rounds; redistribution reaches its floor well before that.
 const buckets=Object.fromEntries(catalogue.stops.map(s=>[s.id,[]]));
 for(const n of pool.npcs)if(!n.vehicle&&n.readyAt<=minute&&buckets[n.stop])buckets[n.stop].push(n);
 for(let h=0;h<Math.min(1000,hour-pool.lastHour);h++){
  let moved=false;
  for(const stop of catalogue.stops){if(buckets[stop.id].length>=10)continue;
   const donor=catalogue.stops.find(s=>buckets[s.id].length>pool.baseline[s.id]);if(!donor)break;
   const n=buckets[donor.id].pop();n.stop=stop.id;n.destination=destination(stop.id,catalogue,n.id+hour+h);buckets[stop.id].push(n);moved=true;
  }if(!moved)break;
 }
 pool.lastHour=hour;
}
export function passengerView(pool,id,minute) {
 const counts={},population={};for(const n of pool.npcs){if(n.vehicle)continue;population[n.stop]=(population[n.stop]||0)+1;if(n.readyAt<=minute)counts[n.stop]=(counts[n.stop]||0)+1;}
 return {session:pool.sessions[id]||null,counts,population,onboard:pool.npcs.filter(n=>n.vehicle===id).map(n=>({id:n.id,boardedStopId:n.stop,destinationStopId:n.destination,fare:n.fare})),total:PASSENGER_TOTAL};
}
export function passengerAction(pool,catalogue,id,input) {
 const {minute,op='status',pose}=input;advancePassengerPool(pool,catalogue,minute);
 let s=pool.sessions[id];
 if(s){s.events=s.events.filter(e=>e.sequence>(input.ack||0));s.seen=minute;if(input.requestId&&s.lastRequest===input.requestId)return passengerView(pool,id,minute);}
 if(op==='start'){
  const route=catalogue.routes.find(r=>r.id===input.routeId);if(!route)throw Error('Unknown passenger route.');
  if(!input.tripId)throw Error('Missing route journey.');
  if(s?.tripId!==input.tripId){release(pool,id,minute);s=pool.sessions[id]={tripId:input.tripId,routeId:route.id,index:0,visited:false,charged:false,closed:false,lastStop:route.stopIds[0],seen:minute,sequence:s?.sequence||0,events:s?.events||[]};}
 } else if(op==='cancel'){release(pool,id,minute);}
 else if(op==='step'||op==='leave'){
  if(!s||s.closed||s.tripId!==input.tripId)throw Error('Passenger journey changed.');
  const route=catalogue.routes.find(r=>r.id===s.routeId),stop=catalogue.stops.find(st=>st.id===route.stopIds[s.index]);
  const inside=pose&&Math.abs(pose.x-stop.x-60)<=125&&Math.abs(pose.y-stop.y-60)<=125;
  const stopped=inside&&Math.abs(pose.speed)<2;
  if(op==='step'&&!stopped)throw Error('Stop in the bus stop zone to collect passengers.');
  if(op==='leave'&&(!s.visited||stopped))throw Error('Finish boarding or leave the stop first.');
  let exitedCount=0,boardedCount=0,fareEarned=0,chargeAgbero=false;
  if(op==='step'){
   for(const n of pool.npcs)if(n.vehicle===id&&n.destination===stop.id){fareEarned+=n.fare;exitedCount++;n.vehicle=null;n.stop=stop.id;n.readyAt=minute+REST_MINUTES;n.destination=null;n.fare=0;}
   s.visited=true;
   const onboard=pool.npcs.filter(n=>n.vehicle===id);
   const availableSeats=Math.max(0,route.capacity-onboard.length);
   const destinations=route.stopIds.slice(s.index+1);
   // Complete boarding in one batch after the stop's loading indicator finishes.
   const boarding=pool.npcs.filter(n=>!n.vehicle&&n.stop===stop.id&&n.readyAt<=minute&&destinations.includes(n.destination)).slice(0,availableSeats);
   for(const passenger of boarding){
    passenger.vehicle=id;passenger.fare=route.job==='danfo'?150+(route.stopIds.indexOf(passenger.destination,s.index+1)-s.index)*100:0;
   }
   boardedCount=boarding.length;
   if(boardedCount){chargeAgbero=!s.charged;s.charged=true;}
  }
  s.lastStop=stop.id;
  const occupied=pool.npcs.filter(n=>n.vehicle===id).length;
  const remaining=pool.npcs.some(n=>!n.vehicle&&n.stop===stop.id&&n.readyAt<=minute&&route.stopIds.slice(s.index+1).includes(n.destination));
  const done=op==='leave'||!remaining||occupied>=route.capacity;
  if(done){s.index++;s.visited=false;s.charged=false;s.closed=s.index>=route.stopIds.length;}
  if(boardedCount||exitedCount||done)s.events.push({sequence:++s.sequence,tripId:s.tripId,type:s.closed?'route-complete':done?'stop-complete':'boarding',routeId:route.id,stopId:stop.id,stopIndex:done?s.index-1:s.index,result:{stopId:stop.id,stopLabel:stop.label,boardedCount,exitedCount,fareEarned,chargeAgbero,remainingWaiting:pool.npcs.filter(n=>!n.vehicle&&n.stop===stop.id&&n.readyAt<=minute).length,occupiedSeats:occupied,capacity:route.capacity}});
 }else if(op!=='status')throw Error('Unknown passenger action.');
 if(s)s.lastRequest=input.requestId;
 return passengerView(pool,id,minute);
}
