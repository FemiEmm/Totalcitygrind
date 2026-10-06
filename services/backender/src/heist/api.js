import {readFileSync} from 'node:fs';
import {transaction} from '../store.js';
import {ApiError} from '../auth.js';
import {createHeists,heistAction} from './rules.js';
const parking=JSON.parse(readFileSync(new URL('../../data-catalog/housing-parking.json',import.meta.url),'utf8'));
export function heistRequest(input){try{return transaction(db=>{
 db.heists ||= {...createHeists(),epoch:Date.now()};
 const state=db.heists,now=Date.now(),id=input.playerId,a=state.accounts[id];
 if(!Number.isFinite(input.minute)||input.minute<0||input.minute>1e9||!Number.isFinite(input.money)||Math.abs(input.money)>1e12)throw Error('Invalid heist state.');
 const save=db.gameStates?.[id]?.snapshot;
 const activeHome=db.housing?.accounts[id]?.activeHomeId||save?.propertyState?.activeHomeId;
 const homeId=!activeHome||activeHome==='starter-rental'?save?.propertyState?.starterHomeId||db.profiles[id]?.progression?.homeId:activeHome;
 const elapsed=a?.lastPulse&&now-a.lastPulse<15000?Math.min((now-a.lastPulse)/1000,Math.max(0,Number(input.elapsed)||0)):0;
 const result=heistAction(state,id,{...input,pose:input.serverPose,home:parking[homeId],worldMinute:(now-state.epoch)/1000,elapsed});
 result.account.lastPulse=now;
 if(result.account.lockUntil>input.minute && db.careers?.[id]){
  db.careers[id].report ||= {crime:0,fines:save?.fineState?.outstandingAmount||0};
  db.careers[id].report.crime=100;
 }
 return result;
});}catch(e){throw new ApiError(400,e.message||'Bank job unavailable.');}}
