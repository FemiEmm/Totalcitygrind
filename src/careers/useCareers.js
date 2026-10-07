import { advanceWaste } from './wasteLifecycle.js';
import { reactive, ref, computed } from 'vue';
import { createCareerState, restoreCareerState, careerAction, tickCareer } from './rules.js';
import { getCourse, getWorkplace, atSchool, nearWorkplace, SERVICE_VEHICLE_IDS, WASTE_LOCATIONS, WASTE_COLLECTION_SECONDS, WASTE_COLLECTION_RADIUS } from './catalogue.js';
import { gameRequest, connection } from '../network/connection.js';
import { getSaveAccount } from '../game/saveSlots.js';
export function useCareers(ctx){
 const state=reactive(createCareerState()),local=reactive({lastReceipt:0,lastResolution:0,returnVehicle:null,returnPose:null,aiTrafficEnabled:true});
 const occupied=ref({}),error=ref(''),busy=ref(false),notice=ref(null),inspection=ref(null),takenWaste=ref([]),modal=ref(null);
 const minute=computed(()=>ctx.minute());
 const school=computed(()=>!ctx.blocked()&&atSchool(ctx.player));
 const workplace=computed(()=>!ctx.blocked()?nearWorkplace(ctx.player):null);
 const duty=computed(()=>state.shift?getCourse(state.job?.courseId)?.service:null);
 const waste=computed(()=>WASTE_LOCATIONS.filter(w=>getSaveAccount()?!takenWaste.value.includes(w.id):!(state.wasteLifecycle.removed[w.id]>minute.value)));
 const collection=reactive({targetId:null,elapsed:0,failed:false});
 const nearbyWaste=computed(()=>duty.value==='lawma'&&ctx.vehicle()==='service-lawma'&&!ctx.blocked()&&!notice.value ? waste.value.filter(w=>Math.hypot(w.x-ctx.player.x,w.y-ctx.player.y)<=WASTE_COLLECTION_RADIUS).sort((a,b)=>Math.hypot(a.x-ctx.player.x,a.y-ctx.player.y)-Math.hypot(b.x-ctx.player.x,b.y-ctx.player.y))[0]||null:null);
 const closestWaste=computed(()=>Math.abs(ctx.player.speed)<2?nearbyWaste.value:null);
 const collectionProgress=computed(()=>Math.min(1,collection.elapsed/WASTE_COLLECTION_SECONDS));
 function retryCollection(){collection.failed=false;collection.elapsed=0;error.value='';}
 const target=computed(()=>['police','lastma'].includes(duty.value)&&Math.abs(ctx.player.speed)<5?connection.players.filter(p=>{const distance=Math.hypot(p.x-ctx.player.x,p.y-ctx.player.y);return distance<180&&(Math.abs(p.speed)<5||distance<100);}).sort((a,b)=>Math.hypot(a.x-ctx.player.x,a.y-ctx.player.y)-Math.hypot(b.x-ctx.player.x,b.y-ctx.player.y))[0]:null);
 let accumulator=0,active=true,schoolEntered=false,lastAutoTarget=null;
 function settle(){for(const r of state.receipts){if(r.id>local.lastReceipt){if(r.publicEmployer&&!getSaveAccount())ctx.publicPay(r.amount,r.label);else ctx.pay(r.amount,r.label);local.lastReceipt=r.id;}}if(!getSaveAccount())state.receipts=[];}
 function syncVehicle(){
  const wanted=SERVICE_VEHICLE_IDS[duty.value];
  if(wanted && !local.returnVehicle){local.returnVehicle=state.returnVehicle||(ctx.vehicle().startsWith('service-')?'starter-danfo':ctx.vehicle());local.returnPose=state.returnPose||{x:ctx.player.x,y:ctx.player.y,rotation:ctx.player.rotation};}
  if(!wanted && !local.returnVehicle && ctx.vehicle().startsWith('service-')){local.returnVehicle=state.returnVehicle||'starter-danfo';local.returnPose=state.returnPose||null;}
  if(wanted && ctx.vehicle()!==wanted){
   ctx.swap(wanted,duty.value==='lawma'?{x:57*120,y:-6*120,rotation:Math.PI}:null);
  }else if(!wanted && local.returnVehicle){const id=local.returnVehicle,pose=local.returnPose;local.returnVehicle=null;local.returnPose=null;ctx.swap(id,pose);}
 }
 async function act(input){
  if(busy.value)return;busy.value=true;error.value='';
  try{
   if(ctx.blocked() && ['class','hire','shift','collect'].includes(input.op))throw Error('Finish the current activity first.');
   if(input.op==='shift' && getCourse(state.job?.courseId)?.service==='lawma' && !ctx.truckBayClear())throw Error('The truck bay is occupied. Wait for it to clear.');
   if(getSaveAccount()){
    if(connection.presence!=='In city')throw Error('Wait for the city connection.');
    const result=await gameRequest('career',{...input,minute:minute.value,report:ctx.report(),blocked:ctx.blocked()});
    if(!active)return;
    Object.assign(state,restoreCareerState(result.state));occupied.value=result.occupied||{};notice.value=result.notice||null;
    if(result.inspection)inspection.value=result.inspection;
    if(result.takenWaste)takenWaste.value=result.takenWaste;
    if(state.resolution && state.resolution.id>local.lastResolution){local.lastResolution=state.resolution.id;ctx.resolve(state.resolution);}
   }else{
    if(['inspect','bribe','arrest','release','resolve-stop'].includes(input.op))throw Error('Enforcement stops apply to online players.');
    advanceWaste(state.wasteLifecycle,minute.value,state.job?.courseId==='lawma');
    careerAction(state,{...input,pose:ctx.player,minute:minute.value},{});
    advanceWaste(state.wasteLifecycle,minute.value,state.job?.courseId==='lawma');
    if(input.op==='shift' && getCourse(state.job?.courseId)?.service){state.returnVehicle=ctx.vehicle();state.returnPose={x:ctx.player.x,y:ctx.player.y,rotation:ctx.player.rotation};}
    occupied.value=state.job?{[state.job.workplaceId+':'+state.job.courseId]:1}:{};
   }
   settle();syncVehicle();
   if(['class','shift'].includes(input.op))modal.value=null;
   if(input.op==='release')inspection.value=null;
   ctx.save();return true;
  }catch(e){error.value=e.message;return false;}finally{busy.value=false;}
 }
 function update(minutes,seconds=minutes){
  if(!active)return;
  if(!getSaveAccount()){
   const wasteChanged=advanceWaste(state.wasteLifecycle,minute.value,state.job?.courseId==='lawma');
   const previousLesson=!!state.lesson,previousShift=!!state.shift;
   tickCareer(state,{minutes,pose:ctx.player,minute:minute.value,blocked:ctx.blocked()});settle();syncVehicle();
   if(wasteChanged || previousLesson!==!!state.lesson || previousShift!==!!state.shift)ctx.save();
  }else{
   accumulator+=minutes;
   if(accumulator>=5&&!busy.value&&connection.presence==='In city'){const elapsed=accumulator;accumulator=0;void act({op:'tick',minutes:elapsed});}
  }
  if(school.value&&!schoolEntered&&!state.lesson&&!state.shift){modal.value='school';schoolEntered=true;}
  if(!school.value)schoolEntered=false;
  if(getSaveAccount() && !busy.value && connection.presence==='In city'){
   if(state.lesson && (!school.value || ctx.blocked()))void act({op:'cancel-class'});
   else if(state.shift && !duty.value && workplace.value?.id!==state.job?.workplaceId)void act({op:'end-shift'});
   else if(notice.value?.kind==='arrest')void act({op:'resolve-stop',choice:'station'});
   else if(target.value && target.value.id!==lastAutoTarget && !inspection.value){
    const p=target.value,dx=ctx.player.x-p.x,dy=ctx.player.y-p.y;
    const inFront=dx*Math.sin(p.rotation)-dy*Math.cos(p.rotation)>0;
    const aligned=Math.abs(dx*Math.cos(p.rotation)+dy*Math.sin(p.rotation))<65;
    if(Math.hypot(dx,dy)<100 || (inFront&&aligned)){lastAutoTarget=p.id;void act({op:'inspect',targetId:p.id});}
   }
  }
  const spot=closestWaste.value;
  if(!spot){collection.targetId=null;collection.elapsed=0;collection.failed=false;}
  else {
   if(collection.targetId!==spot.id){collection.targetId=spot.id;collection.elapsed=0;collection.failed=false;}
   if(!collection.failed){
    collection.elapsed=Math.min(WASTE_COLLECTION_SECONDS,collection.elapsed+Math.max(0,seconds));
    if(collection.elapsed>=WASTE_COLLECTION_SECONDS&&!busy.value){
     collection.failed=true;
     void act({op:'collect',wasteId:spot.id}).then(ok=>{if(active&&ok&&collection.targetId===spot.id){collection.targetId=null;collection.elapsed=0;collection.failed=false;}});
    }
   }
  }
  if(!target.value)lastAutoTarget=null;
  if(modal.value==='school'&&!school.value)modal.value=null;
  if(modal.value==='work'&&!workplace.value)modal.value=null;
  if(notice.value?.expiresAt<Date.now())notice.value=null;
 }
 function restore(saved,metadata){Object.assign(state,restoreCareerState(saved));Object.assign(local,metadata||{});state.lesson=null;if(!getSaveAccount() && state.shift){tickCareer(state,{minutes:0,minute:minute.value,pose:null,blocked:true});}}
 function stop(){active=false;}
 return {state,local,occupied,error,busy,notice,inspection,modal,minute,school,workplace,duty,waste,nearbyWaste,closestWaste,collection,collectionProgress,retryCollection,target,act,update,restore,stop,refresh:()=>act({op:'status'})};
}
