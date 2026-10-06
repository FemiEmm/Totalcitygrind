import {ref,reactive,computed} from 'vue';
import {gameRequest,connection} from '../network/connection.js';
import {getSaveAccount} from '../game/saveSlots.js';
import {createHeists,heistAction,crossesHotspot,atBank,atHome} from './rules.js';
export function useHeist(ctx){
 const offline=ref(createHeists()),local=reactive({lastReceipt:0}),view=ref(null),busy=ref(false),error=ref('');
 const active=computed(()=>['approach','loading','escape'].includes(view.value?.account.status));
 let running=true,accumulator=0,previous=null,arresting=false,timer=null,nextRequestAt=0;
 const locked=()=>ctx.minute()<(view.value?.account.lockUntil||0);
 async function act(input={op:'status'}){
  if(busy.value||!running||!ctx.ready())return false;
  if(getSaveAccount()&&connection.presence!=='In city')return false;
  busy.value=true;error.value='';nextRequestAt=Date.now()+1000;
  try{
   const payload={...input,money:ctx.money(),minute:ctx.minute(),lastReceipt:local.lastReceipt,blocked:ctx.blocked()};
   let result;
   if(getSaveAccount())result=await gameRequest('heist',payload);
   else {const draft=JSON.parse(JSON.stringify(offline.value));result=heistAction(draft,'offline',{...payload,pose:ctx.player,home:ctx.home(),worldMinute:ctx.minute(),elapsed:input.elapsed||0});offline.value=draft;}
   if(!running)return false;
   view.value=result;
   if(input.op==='accept')accumulator=0;
   for(const r of result.account.receipts){if(r.id<=local.lastReceipt)continue;ctx.pay(r.amount,r.label);local.lastReceipt=r.id;}
   if(locked())ctx.crime.score=100;
   if(result.account.status==='caught'){
    arresting=true;ctx.arrest();
   }
   ctx.save();
   if(!getSaveAccount())offline.value.accounts.offline.receipts=[];
   return true;
  }catch(e){nextRequestAt=Date.now()+2000;error.value=e.message;return false;}finally{busy.value=false;}
 }
 function update(seconds){
  if(locked())ctx.crime.score=100;
  if(!running)return;
  const a=view.value?.account;
  if(active.value&&a?.loot>0&&(crossesHotspot(previous,ctx.player)||ctx.crime.status!=='free'))arresting=true;
  previous={x:ctx.player.x,y:ctx.player.y};
  if(arresting){ctx.freeze();if(!busy.value&&Date.now()>=nextRequestAt){if(a?.status==='caught'){ctx.arrest();if(ctx.crime.status==='transfer'||ctx.crime.status==='detained'){arresting=false;void act({op:'ack-arrest'});}}else if(active.value)void act({op:'caught'});}return;}
  if(!active.value){accumulator=0;return;}
  if(!ctx.blocked())accumulator+=seconds;
  const transition=!ctx.blocked()&&active.value&&((a.status==='approach'&&atBank(ctx.player))||(a.status==='loading'&&!atBank(ctx.player))||(a.status==='escape'&&atHome(ctx.player,a.home||ctx.home())));
  if(!busy.value&&Date.now()>=nextRequestAt&&(transition||accumulator>=5&&active.value)) {const elapsed=accumulator;accumulator=0;void act({op:'status',elapsed});}
 }
 function restore(saved,meta){offline.value=saved||createHeists();Object.assign(local,{lastReceipt:0},meta||{});if(!getSaveAccount()&&offline.value.accounts.offline)view.value={account:offline.value.accounts.offline,available:!offline.value.holder&&ctx.minute()>=offline.value.cooldownUntil,cooldownMinutes:0};}
 function start(){timer=setInterval(()=>{if(!document.hidden&&!ctx.blocked()&&!active.value)void act();},15000);void act();}
 function stop(){running=false;clearInterval(timer);}
 return {offline,local,view,busy,error,active,locked,act,update,restore,start,stop};
}
