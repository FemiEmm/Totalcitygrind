// Shared by the client and Backender. All money is whole naira.
export const NOMINATION_FEE=10000000;
export const DEFAULT_GOVERNOR={id:null,name:'DIDEJADE OWOWOLU'};
export const PUBLIC_EMPLOYERS=['police-station','lastma-office','lawma-office','hospital','school'];
export const GOVERNOR_BAY={x:46*120,y:-2*120,width:120,height:120};
const DAY=86400000,WEEK=7*DAY;
export function electionClock(now=Date.now()){
 const local=now+3600000,day=new Date(local).getUTCDay();
 const monday=Math.floor(local/DAY)*DAY-((day+6)%7)*DAY;
 return {week:monday, sunday:day===0, closesAt:monday+WEEK-3600000};
}
export function parkedAtGovernment(p){const b=GOVERNOR_BAY;return !!p&&Math.abs(p.speed||0)<2&&p.x>=b.x&&p.x<b.x+b.width&&p.y>=b.y&&p.y<b.y+b.height;}
export function createGovernment(now=Date.now()){return {week:electionClock(now).week,governor:{...DEFAULT_GOVERNOR},taxRate:15,rentPercent:0,treasury:0,candidates:[],votes:{},accounts:{},arrears:[],nextClaim:1,lastResult:null};}
export function governmentAccount(g,id){return g.accounts[id] ||= {receipts:[],nextReceipt:1,income:{},assessed:{},taxDebt:0,messages:[],nextMessage:1};}
function message(a,text){a.messages.push({id:a.nextMessage++,text});a.messages=a.messages.slice(-30);}
function receipt(a,amount,label,crime=0){a.receipts.push({id:a.nextReceipt++,amount,label,crime});}
export function advanceElection(g,now=Date.now()){
 const clock=electionClock(now);if(clock.week<=g.week)return;
 const counts={};for(const id of Object.values(g.votes))counts[id]=(counts[id]||0)+1;
 const candidates=[...g.candidates].sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0)||a.enteredAt-b.enteredAt||a.id.localeCompare(b.id));
 const winner=clock.week===g.week+WEEK&&candidates.length?candidates[0]:DEFAULT_GOVERNOR;
 g.governor={id:winner.id,name:winner.name};g.lastResult={week:g.week,name:winner.name,votes:counts[winner.id]||0};
 g.week=clock.week;g.candidates=[];g.votes={};
 for(const a of Object.values(g.accounts))message(a,winner.name+' is governor for this week.');
}
export function queuePublicWage(g,id,amount,label){if(amount<=0)return;g.arrears.push({id:g.nextClaim++,playerId:id,amount:Math.round(amount),label});message(governmentAccount(g,id),'Government wages earned: ₦'+Math.round(amount).toLocaleString()+'. Payment depends on treasury funds.');}
export function settlePublicWages(g){
 while(g.treasury>0&&g.arrears.length){const claim=g.arrears[0],paid=Math.min(g.treasury,claim.amount);g.treasury-=paid;claim.amount-=paid;receipt(governmentAccount(g,claim.playerId),paid,claim.label);if(!claim.amount)g.arrears.shift();}
}
export function ingestIncome(g,id,income,currentWeek){
 const a=governmentAccount(g,id);if(!Number.isInteger(currentWeek)||currentWeek<0||currentWeek>1e7)throw Error('Invalid game week.');
 for(const [key,value] of Object.entries(income||{})){
  const week=Number(key),amount=Number(value);if(!Number.isInteger(week)||week<0||week>currentWeek||!Number.isFinite(amount)||amount<0||amount>1e12)continue;
  a.income[key]=Math.max(a.income[key]||0,Math.round(amount));
 }
 for(const [key,total] of Object.entries(a.income))if(Number(key)<currentWeek){
  const assessment=a.assessed[key] ||= {rate:g.taxRate,taxed:0};
  const due=Math.round(total*assessment.rate/100),extra=Math.max(0,due-assessment.taxed);
  if(extra){a.taxDebt+=extra;assessment.taxed=due;message(a,'Game week '+(Number(key)+1)+' income tax: ₦'+extra.toLocaleString()+' ('+assessment.rate+'%).');}
 }
}
export function governmentAction(g,id,input,now=Date.now()){
 advanceElection(g,now);const a=governmentAccount(g,id),clock=electionClock(now);
 if(clock.sunday&&a.electionMessage!==g.week){a.electionMessage=g.week;message(a,'Sunday voting is open until midnight Lagos time. Choose your governor below.');}
 ingestIncome(g,id,input.income, input.gameWeek);
 const balance=Number(input.money),ack=Number(input.lastReceipt)||0;
 if(!Number.isFinite(balance)||Math.abs(balance)>1e12||!Number.isSafeInteger(ack)||ack<0||ack>=a.nextReceipt)throw Error('Invalid account balance or receipt.');
 const pending=a.receipts.filter(r=>r.id>ack).reduce((n,r)=>n+r.amount,0);
 let cash=Math.max(0,balance+pending);
 if(a.taxDebt>0&&cash>0){const paid=Math.min(a.taxDebt,Math.floor(cash));a.taxDebt-=paid;g.treasury+=paid;cash-=paid;receipt(a,-paid,'WEEKLY GOVERNMENT TAX');}
 const op=input.op||'status';
 if(['nominate','policy','loot'].includes(op)&&!parkedAtGovernment(input.pose))throw Error('Park at the governor residence first.');
 if(op==='nominate'){
  if(clock.sunday)throw Error('Nominations close before Sunday voting.');
  if(g.candidates.some(c=>c.id===id))throw Error('You already bought this week’s form.');
  if(cash<NOMINATION_FEE)throw Error('You need ₦10,000,000 for the nomination form.');
  receipt(a,-NOMINATION_FEE,'GOVERNOR NOMINATION FORM');g.treasury+=NOMINATION_FEE;
  g.candidates.push({id,name:String(input.name||'Driver').slice(0,40),enteredAt:now});message(a,'Nomination accepted. Voting takes place this Sunday.');
 }else if(op==='vote'){
  if(!clock.sunday)throw Error('Voting opens on Sunday, Lagos time.');
  if(g.votes[id])throw Error('You already voted this week.');
  if(!g.candidates.some(c=>c.id===input.candidateId))throw Error('Candidate unavailable.');
  g.votes[id]=input.candidateId;message(a,'Your vote has been recorded.');
 }else if(op==='policy'||op==='loot'){
  if(g.governor.id!==id)throw Error('Only the elected governor can do this.');
  if(op==='policy'){
   const tax=Number(input.taxRate),rent=Number(input.rentPercent);
   if(!Number.isFinite(tax)||tax<0||tax>100||!Number.isFinite(rent)||rent< -100||rent>10000)throw Error('Tax must be 0–100%; rent adjustment must be −100% to +10,000%.');
   g.taxRate=tax;g.rentPercent=rent;message(a,'Tax and mainland single-room rent rates updated.');
  }else{
   const amount=Number(input.amount);if(!Number.isSafeInteger(amount)||amount<=0||amount>g.treasury)throw Error('Enter an amount available in the treasury.');
   g.treasury-=amount;receipt(a,amount,'GOVERNMENT FUNDS LOOTED',100);message(a,'Treasury looted: ₦'+amount.toLocaleString()+'. Crime increased by 100.');
  }
 }else if(op!=='status')throw Error('Unknown government action.');
 settlePublicWages(g);return governmentView(g,id,now);
}
export function governmentView(g,id,now=Date.now()){
 const a=governmentAccount(g,id),clock=electionClock(now);
 return {governor:g.governor,taxRate:g.taxRate,rentPercent:g.rentPercent,treasury:g.treasury,week:g.week,sunday:clock.sunday,closesAt:clock.closesAt,candidates:g.candidates.map(c=>({id:c.id,name:c.name})),voted:!!g.votes[id],nominated:g.candidates.some(c=>c.id===id),isGovernor:g.governor.id===id,receipts:a.receipts,messages:a.messages,taxDebt:a.taxDebt,owed:g.arrears.filter(c=>c.playerId===id).reduce((n,c)=>n+c.amount,0),totalOwed:g.arrears.reduce((n,c)=>n+c.amount,0),lastResult:g.lastResult};
}
export function adjustedRent(home,percent){return Math.round(home.weeklyRent*(home.id.startsWith('single-room-row-')?1+percent/100:1));}
