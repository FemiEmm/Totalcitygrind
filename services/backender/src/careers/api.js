import { updateWorldWaste } from './wasteWorld.js';
import { processPublicPayroll } from '../government/api.js';
import { randomUUID } from 'node:crypto';
import { transaction } from '../store.js';
import { ApiError } from '../auth.js';
import { createCareerState, tickCareer, careerAction, finishShift } from './rules.js';
import { getCourse, SERVICE_VEHICLE_IDS, WASTE_LOCATIONS } from './catalogue.js';
function fail(message){throw new ApiError(400,message);}
function applyCareerRequest(input){return transaction(db=>{
 db.careers||={};db.careerNotices||={};
 const id=input.playerId,s=db.careers[id] ||= createCareerState();
 const occupied={};for(const st of Object.values(db.careers)){if(st.job){const key=st.job.workplaceId+':'+st.job.courseId;occupied[key]=(occupied[key]||0)+1;}}
 const now=Date.now(),pose=input.serverPose,minute=Number(input.minute);
 if(!Number.isFinite(minute)||minute<0||minute>1e9)fail('Invalid game time.');
 const sharedWaste=updateWorldWaste(db,now);
 if(input.report && typeof input.report==='object')s.report={crime:Math.max(0,Math.min(100000,Number(input.report.crime)||0)),fines:Math.max(0,Math.min(1e9,Number(input.report.fines)||0))};
 if(s.report&&db.heists?.accounts[id]?.lockUntil>minute)s.report.crime=100;
 // Progress only during connected, unpaused simulation heartbeats. Reconnection never awards elapsed offline time.
 const stalePulse=!s.lastPulse || now-s.lastPulse>15000;
 if(input.op==='tick'){
  const elapsed=Math.min(10,Math.max(0,(now-(s.lastPulse||now))/1000),Math.max(0,Number(input.minutes)||0));
  tickCareer(s,{minutes:stalePulse?0:elapsed,pose,minute,blocked:!pose||!!input.blocked});
 }
 if(s.shift && minute>=s.shift.endsAt)finishShift(s);
 s.lastPulse=now;
 const role=getCourse(s.job?.courseId);
 const targetId=typeof input.targetId==='string'?input.targetId:null;
 const targetPose=input.serverTarget;
 if(['inspect','bribe','arrest','release'].includes(input.op)){
  if(!s.shift||!['police','lastma'].includes(role?.service)||pose?.vehicleId!==SERVICE_VEHICLE_IDS[role.service])fail('Begin an enforcement shift first.');
  if(!targetId||targetId===id||!targetPose||!pose||Math.hypot(targetPose.x-pose.x,targetPose.y-pose.y)>180||Math.abs(pose.speed)>5||(Math.abs(targetPose.speed)>5&&Math.hypot(targetPose.x-pose.x,targetPose.y-pose.y)>=100))fail('Bring the other vehicle to a stop and pull alongside.');
  const victim=db.careers[targetId] ||= createCareerState();
  const targetSave=db.gameStates?.[targetId]?.snapshot;
  const report=victim.report||{crime:targetSave?.crimeState?.score||0,fines:targetSave?.fineState?.outstandingAmount||0};
  const existing=db.careerNotices[targetId];
  if(existing && existing.officerId!==id && existing.expiresAt>now)fail('Another officer is handling this player.');
  if(input.op==='release'){if(existing?.officerId===id)delete db.careerNotices[targetId];}
  else {
   if(input.op==='arrest' && (role.service!=='police'||report.crime<50))fail('Arrest requires a crime rating of at least 50.');
   if(input.op==='bribe' && (role.service==='lastma'?report.fines<=0:report.crime<=0))fail('No outstanding offences.');
   db.careerNotices[targetId]={id:existing?.id||randomUUID(),officerId:id,officerName:db.profiles[id]?.display_name||'Officer',service:role.service,kind:input.op,crime:report.crime,fines:report.fines,amount:role.service==='lastma'?Math.max(100,Math.round(report.fines/2)):Math.max(100,report.crime*100),expiresAt:input.op==='arrest'?now+86400000:now+45000};
  }
  processPublicPayroll(db,id,s);
  return {state:s,occupied,takenWaste:sharedWaste.takenWaste,inspection:{targetId,name:db.profiles[targetId]?.display_name||'Driver',...report},notice:db.careerNotices[id]||null};
 }
 let resolved=null;
 if(input.op==='resolve-stop'){
  const n=db.careerNotices[id];if(!n||n.expiresAt<now)fail('This stop has ended.');
  if(!['fine','bribe','station','release'].includes(input.choice))fail('Choose an available response.');
  if(input.choice==='release' && !(n.kind==='inspect' && n.crime<50 && n.fines<=0))fail('This stop needs to be resolved.');
  if(input.choice==='fine' && (n.service!=='lastma'||n.fines<=0))fail('No traffic fine to pay.');
  if(input.choice==='bribe' && n.kind!=='bribe')fail('No bribe has been requested.');
  if(input.choice==='station' && n.service!=='police')fail('Only police can send you to the station.');
  const amount=input.choice==='fine'?n.fines:input.choice==='bribe'?n.amount:0;
  const saved=db.gameStates?.[id]?.snapshot;
  const pendingBalance=0;
  if(amount && input.money+pendingBalance<amount)fail('Not enough money.');
  if(amount)s.receipts.push({id:s.nextReceipt++,amount:-amount,label:input.choice==='fine'?'TRAFFIC FINE':'OFFICER BRIBE'});
  if(input.choice==='bribe'){
   const officer=db.careers[n.officerId];if(officer)officer.receipts.push({id:officer.nextReceipt++,amount,label:'ENFORCEMENT BRIBE'});
  }
  resolved={id:(s.resolution?.id||0)+1,choice:input.choice,service:n.service,crime:n.crime};
  s.resolution=resolved;
  if(s.report){if(n.service==='lastma')s.report.fines=0;else s.report.crime=db.heists?.accounts[id]?.lockUntil>minute?100:0;}
  delete db.careerNotices[id];
 }else{
  if(input.op==='shift' && getCourse(s.job?.courseId)?.service==='lawma' && input.serverTruckBayBlocked)fail('The waste truck bay is occupied.');
  if(input.blocked && ['class','hire','shift','collect'].includes(input.op))fail('Finish the current activity first.');
  if(!['status','tick'].includes(input.op) && !pose)fail('Connect to the city first.');
  if(input.op==='collect'){
   if(pose?.vehicleId!=='service-lawma')fail('Use your waste collection truck.');
   careerAction(s,{...input,pose,minute,wasteMinute:sharedWaste.minute},occupied,sharedWaste.world);
  }else careerAction(s,{...input,pose,minute},occupied);
  if(input.op==='shift' && getCourse(s.job?.courseId)?.service){s.returnVehicle=pose.vehicleId;s.returnPose={x:pose.x,y:pose.y,rotation:pose.rotation};}
 }
 const service=s.shift?getCourse(s.job?.courseId)?.service:null;
 db.profiles[id].progression||={};db.profiles[id].progression.activeServiceVehicle=SERVICE_VEHICLE_IDS[service]||null;
 const notice=db.careerNotices[id];if(notice?.expiresAt<now)delete db.careerNotices[id];
 for(const key of Object.keys(occupied))delete occupied[key];
 for(const st of Object.values(db.careers)){if(st.job){const key=st.job.workplaceId+':'+st.job.courseId;occupied[key]=(occupied[key]||0)+1;}}
 const {takenWaste}=updateWorldWaste(db,now);
 processPublicPayroll(db,id,s);
 return {state:s,occupied,notice:db.careerNotices[id]||null,resolved,takenWaste};
});}

export function careerRequest(input){try{return applyCareerRequest(input);}catch(error){if(error instanceof ApiError)throw error;throw new ApiError(400,error.message||'Career action unavailable.');}}
