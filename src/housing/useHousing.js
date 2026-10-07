import {ref,reactive} from 'vue';
import {createHousing,housingAction} from './rules.js';
import {gameRequest,connection} from '../network/connection.js';
import {getSaveAccount} from '../game/saveSlots.js';
export function useHousing(ctx){
 const offline=ref(createHousing()),local=reactive({lastReceipt:0,lastMessage:0}),view=ref(null),busy=ref(false),error=ref('');
 let active=true,timer=null,queue=Promise.resolve();
 async function perform(input){
  if(!active||!ctx.ready())return false;
  if(['move','rent','starter'].includes(input.op)&&ctx.heistActive?.()){error.value='Finish the bank job before changing homes.';return false;}
  busy.value=true;error.value='';
  try{
   const payload={...input,day:ctx.day(),money:ctx.money(),savings:ctx.savings(),lastReceipt:local.lastReceipt,initial:JSON.parse(JSON.stringify(ctx.property)),starterHomeId:ctx.property.starterHomeId};
   let result;
   if(getSaveAccount())result=await gameRequest('housing',payload);
   else {const draft=JSON.parse(JSON.stringify(offline.value));result=housingAction(draft,'offline',payload);offline.value=draft;}
   if(!active)return false;
   const previousMessage=local.lastMessage;
   view.value=result;
   for(const r of result.account.receipts){if(r.id<=local.lastReceipt)continue;ctx.pay(r);local.lastReceipt=r.id;}
   const previousHome=ctx.property.activeHomeId;
   ctx.property.ownedPropertyIds=[...result.ownedPropertyIds];ctx.property.activeHomeId=result.account.activeHomeId;ctx.property.mortgage=result.account.mortgage;
   ctx.property.rentals.listings=Object.fromEntries(result.homes.filter(h=>h.owned&&h.listed).map(h=>[h.id,{propertyId:h.id,weeklyRent:h.weeklyRent,status:h.occupied?'rented':'listed',chance:0}]));
   for(const m of result.account.messages){if(m.id<=local.lastMessage)continue;ctx.property.rentals.messages.push({day:m.day,text:m.text,propertyId:'housing'});local.lastMessage=m.id;if(m.text.startsWith('Home robbery:'))ctx.warn(m.text);}
   ctx.property.rentals.messages=ctx.property.rentals.messages.slice(-30);
   if(previousHome!==ctx.property.activeHomeId)ctx.moved(ctx.property.activeHomeId);
   if(input.op!=='status'||previousHome!==ctx.property.activeHomeId||result.account.receipts.length||result.account.messages.some(m=>m.id>previousMessage))ctx.save();
   if(!getSaveAccount())offline.value.accounts.offline.receipts=[];
   return true;
  }catch(e){error.value=e.message;return false;}finally{busy.value=false;}
 }
 function act(input={op:'status'}){queue=queue.then(()=>perform(input));return queue;}
 function restore(saved,metadata){offline.value=saved||createHousing();Object.assign(local,{lastReceipt:0,lastMessage:0},metadata||{});}
 function start(){timer=setInterval(()=>{if(!document.hidden&&!busy.value)void act();},60000);void act();}
 function stop(){active=false;clearInterval(timer);}
 return {view,local,offline,busy,error,act,restore,start,stop};
}
