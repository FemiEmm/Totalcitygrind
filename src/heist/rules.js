export const BANK_CAP=100000000, PER_MINUTE=10000000/60;
export const HOTSPOTS=[[2,19],[22,16],[35,10],[58,28],[24,26],[45,9]];
export const atBank=p=>!!p&&p.x>=49*120&&p.x<50*120&&p.y>=14*120&&p.y<15*120&&Math.abs(p.speed)<2;
export const atHome=(p,b)=>!!p&&!!b&&p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height&&Math.abs(p.speed)<2;
export function crossesHotspot(a,b){
 if(!b)return false;
 return HOTSPOTS.some(([x,y])=>{
  const left=x*120,top=y*120,dx=b.x-(a?.x??b.x),dy=b.y-(a?.y??b.y);let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[a?.x??b.x,dx,left,left+120],[a?.y??b.y,dy,top,top+120]]){
   if(!delta){if(origin<min||origin>=max)return false;continue;}
   const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;
  }return true;
 });
}
export function createHeists(){return {accounts:{},holder:null,cooldownUntil:0};}
export function heistView(db,id,worldMinute){const a=db.accounts[id];return {account:a,available:!db.holder&&worldMinute>=db.cooldownUntil,cooldownMinutes:Math.max(0,db.cooldownUntil-worldMinute),bankBusy:!!db.holder&&db.holder!==id};}
export function heistAction(db,id,input){
 const a=db.accounts[id] ||= {status:'idle',loot:0,lockUntil:0,receipts:[],nextReceipt:1,lastPose:null,collecting:false};
 const {pose,home,minute,worldMinute,op='status'}=input;
 const active=['approach','loading','escape'].includes(a.status);
 function receipt(amount,label){a.receipts.push({id:a.nextReceipt++,amount,label});}
 function end(status){a.status=status;a.collecting=false;db.holder=null;if(a.loot>0)db.cooldownUntil=worldMinute+2*1440;}
 if(op==='accept'){
  if(active||db.holder||worldMinute<db.cooldownUntil)throw Error('The bank job is unavailable right now.');
  if(!pose||!home)throw Error('Connect to the city and select a home first.');
  if(input.blocked)throw Error('Finish your current activity first.');
  db.holder=id;Object.assign(a,{status:'approach',loot:0,lastPose:pose,collecting:false,home:{...home}});
 }else if(active){
  if(op==='caught'||(a.loot>0&&crossesHotspot(null,pose))){
   let cash=Number(input.money)||0;for(const r of a.receipts)if(r.id>(input.lastReceipt||0))cash+=r.amount;
   receipt(-Math.max(0,Math.floor(cash)),'HEIST CASH CONFISCATED');end('caught');a.loot=0;
  }else if(op==='cancel'&&a.loot===0){end('idle');}
  else if(!input.blocked&&pose){
   if(a.status==='loading'&&a.collecting)a.loot=Math.min(BANK_CAP,a.loot+Math.max(0,Math.min(10,input.elapsed||0))*PER_MINUTE);
   if(a.status==='approach'&&atBank(pose))a.status='loading';
   else if(a.status==='loading'&&!atBank(pose)){a.status=a.loot>0?'escape':'approach';}
   if(a.status==='escape'&&atHome(pose,a.home||home)){
    receipt(Math.floor(a.loot/2),'MR-WIRE HEIST SHARE');a.lockUntil=Math.max(a.lockUntil,minute+14*1440);end('completed');
   }
  }
 }else if(!['status','ack-arrest'].includes(op))throw Error('No active bank job.');
 if(op==='ack-arrest'&&a.status==='caught')a.status='failed';
 a.collecting=a.status==='loading'&&!input.blocked&&atBank(pose)&&a.loot<BANK_CAP;
 if(pose)a.lastPose={x:pose.x,y:pose.y};
 return heistView(db,id,worldMinute);
}
