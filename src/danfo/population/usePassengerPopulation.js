import {ref,shallowRef,reactive} from 'vue';
import catalogue from './catalogue.json';
import {startDanfoPassengerRoute,processDanfoStop} from '../systems/danfoPassengers.js';
const routes=new Map(catalogue.routes.map(r=>[r.id,r]));
const stops=new Map(catalogue.stops.map(s=>[s.id,s]));
const configFor=r=>({capacity:r.job==='brt'?48:14,minimumWaitingPerStop:r.job==='brt'?5:2,maximumWaitingPerStop:r.job==='brt'?16:8,baseFare:r.job==='brt'?0:150,farePerStop:r.job==='brt'?0:100,feedbackSeconds:2.4});
// The public interface is retained for existing saves; no population pool or network boarding remains.
export function usePassengerPopulation(ctx){
 const pool=shallowRef(null),local=reactive({mode:'local-batches-v1'}),error=ref(''),view=ref(null),activity=ref('');
 let journey=null,stopped=false;
 function initialize(){
  const r=routes.get(ctx.route.selectedRouteId);if(!r)return;
  ctx.route.tripId ||= crypto.randomUUID();journey=ctx.route.tripId;
  startDanfoPassengerRoute({passengerState:ctx.passengers,route:r,config:configFor(r)});
 }
 function restore(saved,meta){
  if(meta?.mode==='local-batches-v1'){journey=ctx.route.tripId;return;}
  // Old shared-population journeys cannot be resumed against local passenger destinations.
  if(ctx.route.status==='active'){ctx.route.currentStopIndex=0;ctx.route.stopHoldSeconds=0;ctx.route.tripId=crypto.randomUUID();initialize();}
 }
 function update(seconds,blocked){
  const state=ctx.route;
  if(stopped||blocked||state.status!=='active'){state.stopHoldSeconds=0;return null;}
  const route=routes.get(state.selectedRouteId);if(!route)return null;
  if(journey!==state.tripId||!journey)initialize();
  const stop=stops.get(route.stopIds[state.currentStopIndex]);if(!stop)return null;
  const inside=Math.abs(ctx.player.x-stop.x-60)<=125&&Math.abs(ctx.player.y-stop.y-60)<=125&&Math.abs(ctx.player.speed)<2;
  state.stopHoldSeconds=inside?Math.min(1.25,state.stopHoldSeconds+seconds):0;
  if(state.stopHoldSeconds<1.25)return null;
  const stopIndex=state.currentStopIndex;
  const result=processDanfoStop({passengerState:ctx.passengers,route,stop,stopIndex,config:configFor(route)});
  result.chargeAgbero=result.boardedCount>0;
  state.currentStopIndex++;state.stopHoldSeconds=0;
  const complete=state.currentStopIndex>=route.stopIds.length;
  if(complete){state.status='complete';state.completedRouteId=route.id;}
  const event={type:complete?'route-complete':'stop-complete',route,stop,stopIndex,result,tripId:state.tripId};
  // Online earnings settle independently; boarding and navigation never wait on them.
  ctx.onStop?.(event);
  return event;
 }
 function wake(){ctx.route.stopHoldSeconds=0;}
 function stop(){stopped=true;}
 return {pool,local,error,view,activity,restore,update,wake,stop};
}
