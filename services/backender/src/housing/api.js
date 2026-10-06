import {readFileSync} from 'node:fs';
const parking=JSON.parse(readFileSync(new URL('../../data-catalog/housing-parking.json',import.meta.url),'utf8'));
import {transaction} from '../store.js';
import {ApiError} from '../auth.js';
import {createHousing,housingAccount,housingAction} from './rules.js';
export function housingRequest(input){try{return transaction(db=>{
 if(['move','rent','starter'].includes(input.op)&&['approach','loading','escape'].includes(db.heists?.accounts[input.playerId]?.status))throw Error('Finish the bank job before changing homes.');
 db.housing ||= createHousing();
 // Import existing purchases once. Shared homes cannot have two owners.
 for(const id of Object.keys(db.profiles)){
  const save=db.gameStates?.[id]?.snapshot;
  housingAccount(db.housing,id,save?.propertyState||{},save?.gameClock?.day||1);
 }
 const saved=db.gameStates?.[input.playerId]?.snapshot;
 if(!Number.isFinite(input.day)||input.day<1||input.day>1e7)throw Error('Invalid game day.');
 if(!Number.isFinite(input.money)||Math.abs(input.money)>1e12||!Number.isFinite(input.savings)||input.savings<0||input.savings>1e12)throw Error('Invalid balance.');
 if(input.op==='sleep'){
  if(['approach','loading','escape'].includes(db.heists?.accounts[input.playerId]?.status))throw Error('Finish the bank job before sleeping.');
  const a=db.housing.accounts[input.playerId],p=input.serverPose;
  const homeId=a.activeHomeId==='starter-rental'?(saved?.propertyState?.starterHomeId||db.profiles[input.playerId]?.progression?.homeId):a.activeHomeId;
  const bay=parking[homeId];
  if(!p||!bay||Math.abs(p.speed)>=2||p.x<bay.x||p.x>bay.x+bay.width||p.y<bay.y||p.y>bay.y+bay.height)throw Error('Stop in your home parking bay before sleeping.');
 }
 return housingAction(db.housing,input.playerId,{...input,initial:undefined,starterHomeId:saved?.propertyState?.starterHomeId||db.profiles[input.playerId]?.progression?.homeId});
});}catch(e){throw new ApiError(400,e.message||'Housing unavailable.');}}
