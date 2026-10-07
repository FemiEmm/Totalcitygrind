import {ref,reactive,computed,watch} from 'vue';
import {gameRequest,connection} from '../network/connection.js';
import {getSaveAccount} from '../game/saveSlots.js';
import {createGovernment,governmentAction,governmentView,parkedAtGovernment,queuePublicWage,settlePublicWages} from './rules.js';
export function useGovernment(ctx){
 const local=reactive({lastReceipt:0,readThrough:0,income:{}}),offline=ref(createGovernment());
 const view=ref(governmentView(offline.value,'offline')),busy=ref(false),error=ref(''),modal=ref(false);
 const parked=computed(()=>ctx.ready()&&!ctx.blocked()&&parkedAtGovernment(ctx.player));
 const unread=computed(()=>view.value.messages.filter(m=>m.id>local.readThrough).length);
 let timer=null,stopParkingWatch=null,active=true,lastGameWeek=-1;
 const week=()=>Math.max(0,Math.floor((ctx.day()-1)/7));
 function earn(amount){if(!ctx.ready()||!Number.isFinite(amount)||amount<=0)return;const key=week();local.income[key]=(local.income[key]||0)+Math.round(amount);}
 function track(event){
  if(event.type==='savings-interest'){earn(event.amount);return;}
  if(event.direction!=='income'||['quick-loan','bank-loan','emergency-medical-credit','stock-sale','government-loot','savings-withdrawal','property-sale','vehicle-sale'].includes(event.type))return;
  earn(event.amount);
 }
 function settle(){for(const r of view.value.receipts||[]){if(r.id<=local.lastReceipt)continue;ctx.pay(r.amount,r.label,r.crime?'government-loot':'government-income');if(r.crime)ctx.crime(r.crime);local.lastReceipt=r.id;}}
 function publicWage(amount,label){queuePublicWage(offline.value,'offline',amount,label);settlePublicWages(offline.value);view.value=governmentView(offline.value,'offline');settle();}
 async function act(input={op:'status'}){
  if(input.op==='read'){local.readThrough=view.value.messages.at(-1)?.id||0;ctx.save();return;}
  if(busy.value||!active||!ctx.ready())return;
  if(getSaveAccount()&&connection.presence!=='In city'&&!['status','vote'].includes(input.op||'status'))return;
  busy.value=true;error.value='';
  const previousReceipt=local.lastReceipt,previousRent=view.value.rentPercent,previousElection=view.value.week;
  try{
   if(['nominate','policy','loot'].includes(input.op)&&!parked.value)throw Error('Park at the governor residence first.');
   const payload={...input,money:ctx.money(),income:{...local.income},gameWeek:week(),lastReceipt:local.lastReceipt};
   if(getSaveAccount()){
    const result=await gameRequest('government',payload);if(!active)return;view.value=result;
   }else{
    const draft=JSON.parse(JSON.stringify(offline.value));
    view.value=governmentAction(draft,'offline',{...payload,pose:ctx.player,name:ctx.name()});offline.value=draft;
   }
   settle();ctx.rent(view.value.rentPercent);
   if(input.op!=='status'||previousReceipt!==local.lastReceipt||previousRent!==view.value.rentPercent||previousElection!==view.value.week)ctx.save();
   if(!getSaveAccount())offline.value.accounts.offline.receipts=offline.value.accounts.offline.receipts.filter(r=>r.id>local.lastReceipt);
  }catch(e){error.value=e.message;}finally{busy.value=false;}
 }
 function update(){
  if(!ctx.ready())return;

  if(week()!==lastGameWeek&&!busy.value){lastGameWeek=week();void act();}
 }
 // A restored, stationary player can enter without another movement tick.
 function open(){
  if(!parked.value)return;
  modal.value=true;
  void act();
 }
 function restore(state,metadata){offline.value=state||createGovernment();Object.assign(local,{lastReceipt:0,readThrough:0,income:{}},metadata||{});if(!getSaveAccount())view.value=governmentView(offline.value,'offline');}
 function start(){
  stopParkingWatch=watch(parked,isParked=>{
   if(isParked)open();else modal.value=false;
  },{flush:'post',immediate:true});
  timer=setInterval(()=>{if(!document.hidden)void act();},60000);}
 function stop(){active=false;stopParkingWatch?.();clearInterval(timer);}
 return {local,offline,view,busy,error,modal,parked,unread,track,earn,publicWage,act,open,update,restore,start,stop};
}
