export const CLUB_DRINKS=[
 {id:'eko-reserve',name:'Eko Reserve',price:50000,intoxication:10},
 {id:'mainland-gold',name:'Mainland Gold',price:150000,intoxication:20},
 {id:'owanbe-rose',name:'Owanbe Rosé',price:300000,intoxication:35},
 {id:'big-baller-noir',name:'Big Baller Noir',price:600000,intoxication:60},
 {id:'one-million-crown',name:'One Million Crown',price:1000000,intoxication:100,celebration:true},
];
export function atClub(p){return !!p&&Math.abs(p.speed||0)<2&&p.x>=36*120&&p.x<37*120&&p.y>=30*120&&p.y<31*120;}
export function createClub(){return {events:[],accounts:{}};}
export function clubAction(state,id,input,now=Date.now()){
 state.events=state.events.filter(e=>e.until>now);
 const account=state.accounts[id] ||= {receipts:[],nextReceipt:1};
 if(input.op==='buy'){
  if(!atClub(input.pose))throw Error('Park in the CLUB bay first.');
  const drink=CLUB_DRINKS.find(d=>d.id===input.drinkId);if(!drink)throw Error('Unknown drink.');
  const cash=Number(input.money),ack=Number(input.lastReceipt)||0;
  if(!Number.isFinite(cash)||Math.abs(cash)>1e12||!Number.isSafeInteger(ack)||ack<0||ack>=account.nextReceipt)throw Error('Invalid drink payment.');
  const pending=account.receipts.filter(r=>r.id>ack).reduce((sum,r)=>sum+r.price,0);
  if(cash-pending<drink.price)throw Error('Not enough money.');
  if(drink.celebration&&state.events.length>=100)throw Error('The celebration queue is full. Try again shortly.');
  account.receipts.push({id:account.nextReceipt++,drinkId:drink.id,price:drink.price});
  if(drink.celebration){const start=Math.max(now,state.events.at(-1)?.until||0);state.events.push({id:id+':'+(account.nextReceipt-1),name:String(input.name||'Driver').slice(0,40),start,until:start+30000});}
 }else if(input.op!=='status')throw Error('Unknown club action.');
 return {receipts:account.receipts,events:state.events,serverNow:now};
}
