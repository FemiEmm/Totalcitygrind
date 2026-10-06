import {reactive,ref,computed} from 'vue';
import {getSaveAccount} from '../game/saveSlots.js';
import {connection,gameRequest} from '../network/connection.js';
import {createClub,clubAction,atClub,CLUB_DRINKS} from './catalogue.js';
export function useClub(ctx){
 const local=reactive({lastReceipt:0}),offline=ref(createClub()),events=ref([]),modal=ref(false),busy=ref(false),error=ref('');
 const parked=computed(()=>ctx.ready()&&!ctx.blocked()&&atClub(ctx.player));
 let active=true,timer=null,offset=0;
 const now=()=>Date.now()+offset;
 async function act(op='status',drinkId){
  if(!active||busy.value||!ctx.ready())return;
  if(getSaveAccount()&&connection.presence!=='In city')return;
  if(op==='buy'&&!parked.value){error.value='Park in the CLUB bay first.';return;}
  busy.value=true;if(op==='buy')error.value='';
  try{
   const payload={op,drinkId,money:ctx.money(),lastReceipt:local.lastReceipt};
   let result;
   if(getSaveAccount()){result=await gameRequest('club',payload);if(!active)return;offset=result.serverNow-Date.now();}
   else {const draft=JSON.parse(JSON.stringify(offline.value));result=clubAction(draft,'offline',{...payload,pose:ctx.player,name:ctx.name()});offline.value=draft;}
   events.value=result.events;
   let changed=false;
   for(const r of result.receipts){if(r.id<=local.lastReceipt)continue;const drink=CLUB_DRINKS.find(d=>d.id===r.drinkId);if(!drink)continue;ctx.consume(drink);local.lastReceipt=r.id;changed=true;}
   if(changed)ctx.save();
   if(!getSaveAccount())offline.value.accounts.offline.receipts=offline.value.accounts.offline.receipts.filter(r=>r.id>local.lastReceipt);
  }catch(e){error.value=e.message;}finally{busy.value=false;}
 }
 function restore(saved,metadata){offline.value=saved||createClub();Object.assign(local,{lastReceipt:0},metadata||{});events.value=getSaveAccount()?[]:offline.value.events;}
 function update(){if(!parked.value)modal.value=false;}
 function start(){timer=setInterval(()=>{if(!document.hidden)void act();},5000);}
 function stop(){active=false;clearInterval(timer);}
 return {local,offline,events,parked,modal,busy,error,act,restore,update,start,stop,now};
}
