import {readFileSync} from 'node:fs';
import {transaction} from '../store.js';
import {ApiError} from '../auth.js';
import {createPassengerPool,passengerAction} from './rules.js';
const catalogue=JSON.parse(readFileSync(new URL('./catalogue.json',import.meta.url),'utf8'));
export function passengerRequest(input){try{return transaction(db=>{
 const now=Date.now();db.passengerEpoch ||= now;
 const minute=(now-db.passengerEpoch)/1000;
 db.passengers ||= createPassengerPool(catalogue,minute);
 const pose=input.serverPose;
 if(['start','step','leave'].includes(input.op)&&!pose)throw Error('Reconnect to the city before boarding.');
 const route=catalogue.routes.find(r=>r.id===(input.routeId||db.passengers.sessions[input.playerId]?.routeId));
 if(['start','step'].includes(input.op)&&route){
  const vehicle=String(pose.vehicleId||'');
  if(route.job==='brt'?!vehicle.includes('brt'):!vehicle.includes('danfo'))throw Error('Use the correct vehicle for this route.');
 }
 return passengerAction(db.passengers,catalogue,input.playerId,{...input,pose,minute});
});}catch(e){throw new ApiError(400,e.message||'Passenger service unavailable.');}}
