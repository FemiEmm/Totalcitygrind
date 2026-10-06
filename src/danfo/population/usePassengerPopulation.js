import {ref,shallowRef,reactive} from 'vue';
import catalogue from './catalogue.json';
import {getSaveAccount} from '../../game/saveSlots.js';
import {startDanfoPassengerRoute,processDanfoStop} from '../systems/danfoPassengers.js';
const routes=new Map(catalogue.routes.map(r=>[r.id,r]));
const stops=new Map(catalogue.stops.map(s=>[s.id,s]));
const configFor=r=>({capacity:r.job==='brt'?48:14,minimumWaitingPerStop:r.job==='brt'?5:2,maximumWaitingPerStop:r.job==='brt'?16:8,baseFare:r.job==='brt'?0:150,farePerStop:r.job==='brt'?0:100,feedbackSeconds:2.4});
// The public interface is retained for existing saves; no population pool or network boarding remains.
export function usePassengerPopulation(ctx){
 const pool=shallowRef(null),local=reactive({mode:'local-batches-v1',pendingPayments:[]}),error=ref(''),view=ref(null),activity=ref('');
 let journey=null,stopped=false,paymentBusy=false,retryAt=0;
 async function flushPayments(){
  if(stopped||paymentBusy||Date.now()<retryAt||!local.pendingPayments.length)return;
  const payment=local.pendingPayments[0];
  if(payment.account!==getSaveAccount()){local.pendingPayments.shift();return;}
  paymentBusy=true;
  try{
   const result=await ctx.pay(payment.command);
   if(stopped)return;
   local.pendingPayments.shift();ctx.onPaid?.(Date.now()-payment.command.requestTime>10000?{...result,agberoPayment:null}:result);
  }catch(e){
   if(stopped)return;
   const permanent=(e.status>=400&&e.status<500&&e.status!==408&&e.status!==429)||Date.now()-payment.command.requestTime>120000;
   if(permanent){local.pendingPayments.shift();ctx.onPaymentError?.(e.message);}
   else {retryAt=Date.now()+5000;if(!payment.warned){payment.warned=true;ctx.onPaymentError?.('Payment is delayed. We will retry while you keep driving.');}}
  }finally{paymentBusy=false;}
 }
 function initialize(){
  const r=routes.get(ctx.route.selectedRouteId);if(!r)return;
  ctx.route.tripId ||= crypto.randomUUID();journey=ctx.route.tripId;
  startDanfoPassengerRoute({passengerState:ctx.passengers,route:r,config:configFor(r)});
 }
 function restore(saved,meta){
  if(meta?.mode==='local-batches-v1'){journey=ctx.route.tripId;local.pendingPayments=Array.isArray(meta.pendingPayments)?meta.pendingPayments:[];return;}
  // Old shared-population journeys cannot be resumed against local passenger destinations.
  if(ctx.route.status==='active'){ctx.route.currentStopIndex=0;ctx.route.stopHoldSeconds=0;ctx.route.tripId=crypto.randomUUID();initialize();}
 }
 function update(seconds,blocked){
  void flushPayments();
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
  if(getSaveAccount()){
   local.pendingPayments.push({account:getSaveAccount(),command:{op:'transport-stop',routeId:route.id,tripId:state.tripId,stopIndex,requestId:crypto.randomUUID(),requestTime:Date.now()}});
   void flushPayments();
  }
  return event;
 }
 function wake(){ctx.route.stopHoldSeconds=0;}
 function stop(){stopped=true;}
 return {pool,local,error,view,activity,restore,update,wake,stop};
}
