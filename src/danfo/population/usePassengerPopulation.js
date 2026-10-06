import {ref,shallowRef,reactive} from 'vue';
import catalogue from './catalogue.json';
import {createPassengerPool,advancePassengerPool,passengerAction,BOARD_SECONDS} from './rules.js';
import {getSaveAccount} from '../../game/saveSlots.js';
import {connection,gameRequest} from '../../network/connection.js';
const routesById = new Map(catalogue.routes.map(route => [route.id, route]));
const stopsById = new Map(catalogue.stops.map(stop => [stop.id, stop]));
export function usePassengerPopulation(ctx){
 const pool=shallowRef(null),local=reactive({ack:0}),error=ref(''),view=ref(null);
 let busy=false,pending=null,nextAt=0,stopped=false,hold=0,stopKey='',statusAt=0;
 function restore(saved,meta){pool.value=saved||null;local.ack=meta?.ack||0;}
 async function send(command){
  if(busy||stopped)return;
  if(getSaveAccount()&&connection.presence!=='In city')return;
  busy=true;pending ||= {...command,requestId:crypto.randomUUID()};nextAt=Date.now()+3000;
  try{
   let result;
   if(getSaveAccount())result=await gameRequest('passengers',{...pending,ack:local.ack});
   else {pool.value ||= createPassengerPool(catalogue,ctx.minute());result=passengerAction(pool.value,catalogue,'offline',{...pending,ack:local.ack,minute:ctx.minute(),pose:ctx.player});}
   if(stopped)return;
   view.value=result;pending=null;error.value='';
   Object.assign(ctx.passengers,{onboard:result.onboard,waitingByStopId:result.counts});
   const s=result.session;
   if(s&&ctx.route.status==='active'&&s.tripId===ctx.route.tripId){ctx.route.currentStopIndex=s.index;ctx.route.status=s.closed?'complete':'active';if(s.closed)ctx.route.completedRouteId=s.routeId;}
  }catch(e){error.value=e.message;if(/Stop in the bus stop|Finish boarding|journey changed/.test(e.message))pending=null;nextAt=Date.now()+5000;}finally{busy=false;}
 }
 function update(seconds,blocked){
  if(stopped)return null;
  if(!getSaveAccount()){pool.value ||= createPassengerPool(catalogue,ctx.minute());advancePassengerPool(pool.value,catalogue,ctx.minute());}
  const event=view.value?.session?.events.find(e=>e.sequence>local.ack);
  if(event){local.ack=event.sequence;const route=routesById.get(event.routeId),stop=stopsById.get(event.stopId);ctx.passengers.lastStopResult=event.result;ctx.passengers.feedbackSecondsRemaining=2.4;return {...event,route,stop};}
  const r=ctx.route,s=view.value?.session;
  const currentRoute=routesById.get(r.selectedRouteId),currentStop=stopsById.get(currentRoute?.stopIds[r.currentStopIndex]);
  const near=currentStop&&Math.abs(ctx.player.x-currentStop.x-60)<=125&&Math.abs(ctx.player.y-currentStop.y-60)<=125&&Math.abs(ctx.player.speed)<2;
  const progressKey=r.tripId+':'+r.currentStopIndex;
  if(stopKey!==progressKey){stopKey=progressKey;hold=0;}
  hold=near&&!blocked?Math.min(BOARD_SECONDS,hold+seconds):0;
  r.stopHoldSeconds=hold/BOARD_SECONDS*1.25;
  if(busy||Date.now()<nextAt)return null;
  if(blocked&&pending&&['step','start','leave'].includes(pending.op)&&r.status==='active')return null;
  if(pending){if(pending.tripId&&(pending.tripId!==r.tripId||r.status!=='active'))pending=null;else {void send(pending);return null;}}
  if(!view.value){void send({op:'status'});return null;}
  if(r.status!=='active'){
   if(s&&!s.closed)void send({op:'cancel'});
   else if(Date.now()>=statusAt){statusAt=Date.now()+60000;void send({op:'status'});}
   return null;
  }
  if(blocked)return null;
  r.tripId ||= crypto.randomUUID();
  if(s?.tripId!==r.tripId){void send({op:'start',tripId:r.tripId,routeId:r.selectedRouteId});return null;}
  const route=routesById.get(r.selectedRouteId),stop=stopsById.get(route?.stopIds[r.currentStopIndex]);
  if(!stop)return null;
  const inside=Math.abs(ctx.player.x-stop.x-60)<=125&&Math.abs(ctx.player.y-stop.y-60)<=125&&Math.abs(ctx.player.speed)<2;
  if(!inside){hold=0;r.stopHoldSeconds=0;if(s.visited)void send({op:'leave',tripId:r.tripId});else if(Date.now()>=statusAt){statusAt=Date.now()+15000;void send({op:'status'});}return null;}
  if(hold>=BOARD_SECONDS){hold=0;void send({op:'step',tripId:r.tripId});}
  return null;
 }
 function wake(){nextAt=0;}
 function stop(){stopped=true;}
 return {pool,local,error,view,restore,update,wake,stop};
}
