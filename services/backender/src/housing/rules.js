import { PROPERTY_CATALOGUE } from '../property/data/properties.js';
export const NEPA_BILL=30000, WASTE_BILL=15000;
const homes=PROPERTY_CATALOGUE.filter(p=>p.tenure==='ownership');
export function createHousing(){return {accounts:{},homes:{}};}
export function housingAccount(db,id,initial={},day=1){
 if(!db.accounts[id]){
  const a=db.accounts[id]={activeHomeId:'starter-rental',mortgage:initial.mortgage||null,bills:{},debt:0,robberyWeek:-1,receipts:[],nextReceipt:1,messages:[],nextMessage:1};
  for(const homeId of initial.ownedPropertyIds||[])if(homes.some(p=>p.id===homeId)&&!db.homes[homeId]){db.homes[homeId]={ownerId:id,tenantId:null,occupantId:null,weeklyRent:null};a.bills[homeId]=day+7;}
  for(const homeId of initial.ownedPropertyIds||[]){
   const home=homes.find(p=>p.id===homeId);
   if(home&&db.homes[homeId]?.ownerId!==id){
    const loan=a.mortgage?.propertyId===homeId?a.mortgage.balance:0;
    receipt(a,Math.max(0,home.price-loan),'LEGACY HOME EQUITY REFUND');
    if(loan)a.mortgage=null;
    message(a,home.name+' was already allocated to another owner. Your property equity has been refunded; choose another house.',day);
   }
  }
  if(db.homes[initial.activeHomeId]?.ownerId===id){a.activeHomeId=initial.activeHomeId;db.homes[a.activeHomeId].occupantId=id;}
 }
 return db.accounts[id];
}
function message(a,text,day){a.messages.push({id:a.nextMessage++,day,text});a.messages=a.messages.slice(-30);}
function receipt(a,amount,label,savings=0){a.receipts.push({id:a.nextReceipt++,amount,savings,label});}
function leave(db,id,a){
 const old=db.homes[a.activeHomeId];
 if(old?.tenantId===id){if(old.overdue>0)throw Error('Pay overdue rent before ending this tenancy.');old.tenantId=null;old.nextDueDay=null;}
 if(old?.occupantId===id)old.occupantId=null;
 a.activeHomeId='starter-rental';
}
export function housingView(db,id){
 const a=db.accounts[id];
 return {account:a,ownedPropertyIds:homes.filter(p=>db.homes[p.id]?.ownerId===id).map(p=>p.id),homes:homes.map(p=>{const row=db.homes[p.id];return {...p,owned:row?.ownerId===id,available:!row,occupied:!!row?.occupantId,tenant:row?.tenantId===id,listed:row?.weeklyRent!=null,weeklyRent:row?.weeklyRent??null,overdue:row?.tenantId===id?row.overdue||0:0};})};
}
export function housingAction(db,id,input,random=Math.random){
 const day=Math.max(1,Math.floor(Number(input.day)||1)),a=housingAccount(db,id,input.initial,day);
 const op=input.op||'status',home=homes.find(p=>p.id===input.propertyId);
 let cash=Number(input.money)||0,savings=Math.max(0,Number(input.savings)||0);
 // Unacknowledged receipts are included so retries cannot spend the same balance twice.
 for(const r of a.receipts)if(r.id>(Number(input.lastReceipt)||0)){cash+=r.amount;savings+=r.savings||0;}
 cash=Math.max(0,cash);savings=Math.max(0,savings);
 function debit(amount,label,bank=false){
  if(!Number.isSafeInteger(amount)||amount<0||amount>cash+(bank?savings:0))throw Error('Not enough money.');
  const fromCash=Math.min(cash,amount),fromBank=amount-fromCash;cash-=fromCash;savings-=fromBank;receipt(a,-fromCash,label,-fromBank);
 }
 // Bills belong to the owner, including homes that are rented out.
 for(const p of homes){if(db.homes[p.id]?.ownerId!==id)continue;
  a.bills[p.id]??=day+7;
  if(day>=a.bills[p.id]){const weeks=Math.floor((day-a.bills[p.id])/7)+1;const amount=weeks*(NEPA_BILL+WASTE_BILL);a.debt+=amount;a.bills[p.id]+=weeks*7;message(a,p.name+': NEPA ₦30,000 + waste ₦15,000 per week. Bill added: ₦'+amount.toLocaleString()+'.',day);}
 }
 if(a.debt>0&&cash>0){const paid=Math.min(a.debt,Math.floor(cash));debit(paid,'NEPA AND WASTE BILLS');a.debt-=paid;}
 if(a.mortgage&&day>=a.mortgage.nextDueDay){const m=a.mortgage,weeks=Math.floor((day-m.nextDueDay)/7)+1;const due=Math.min(m.balance,(m.arrears||0)+weeks*m.weeklyPayment),paid=Math.min(due,Math.floor(cash+savings));if(paid)debit(paid,'HOME MORTGAGE',true);m.balance-=paid;m.arrears=due-paid;m.nextDueDay+=weeks*7;if(!m.balance)a.mortgage=null;}
 const tenancy=db.homes[a.activeHomeId];
 if(tenancy?.tenantId===id){
  if(day>=tenancy.nextDueDay){const weeks=Math.floor((day-tenancy.nextDueDay)/7)+1;tenancy.overdue=(tenancy.overdue||0)+weeks*tenancy.leaseRent;tenancy.nextDueDay+=weeks*7;}
  const paid=Math.min(tenancy.overdue||0,Math.floor(cash));
  if(paid){debit(paid,'WEEKLY HOUSE RENT');tenancy.overdue-=paid;const owner=db.accounts[tenancy.ownerId];receipt(owner,paid,'PROPERTY RENT');message(owner,'Rent received: ₦'+paid.toLocaleString()+'.',day);}
 }
 if(op==='buy'){
  if(!home||db.homes[home.id])throw Error('This house is no longer for sale.');
  const mortgage=input.paymentMethod==='mortgage';if(mortgage&&a.mortgage)throw Error('Finish your current mortgage first.');
  debit(mortgage?home.deposit:home.price,home.name.toUpperCase()+' PURCHASE',true);
  db.homes[home.id]={ownerId:id,tenantId:null,occupantId:null,weeklyRent:null};a.bills[home.id]=day+7;
  if(mortgage)a.mortgage={propertyId:home.id,balance:home.price-home.deposit,weeklyPayment:home.weeklyPayment,nextDueDay:day+7,arrears:0};
  message(a,'You own '+home.name+'. Move in or list it for rent.',day);
 }else if(op==='move'){
  const row=db.homes[home?.id];if(!row||row.ownerId!==id||row.tenantId)throw Error('Choose a vacant house you own.');
  leave(db,id,a);a.activeHomeId=home.id;row.occupantId=id;row.weeklyRent=null;message(a,'Moved into '+home.name+'.',day);
 }else if(op==='starter'){leave(db,id,a);message(a,'Returned to your starter room.',day);}
 else if(op==='list'){
  const row=db.homes[home?.id],rent=Number(input.weeklyRent);
  if(!row||row.ownerId!==id||row.occupantId)throw Error('Move out before listing this house.');
  if(!Number.isSafeInteger(rent)||rent<1||rent>1e12)throw Error('Enter a positive whole-naira weekly rent.');
  row.weeklyRent=rent;message(a,home.name+' listed at ₦'+rent.toLocaleString()+' per week.',day);
 }else if(op==='unlist'){
  const row=db.homes[home?.id];if(!row||row.ownerId!==id||row.tenantId)throw Error('Only a vacant owned listing can be removed.');row.weeklyRent=null;
 }else if(op==='rent'){
  const row=db.homes[home?.id];if(!row||row.ownerId===id||row.weeklyRent==null||row.occupantId)throw Error('This rental is no longer available.');
  leave(db,id,a);debit(row.weeklyRent,'FIRST WEEK HOUSE RENT');
  row.tenantId=id;row.occupantId=id;row.leaseRent=row.weeklyRent;row.nextDueDay=day+7;row.overdue=0;a.activeHomeId=home.id;
  const owner=db.accounts[row.ownerId];receipt(owner,row.weeklyRent,'PROPERTY RENT');message(owner,home.name+' has a new tenant.',day);message(a,'Moved into '+home.name+'. Weekly rent: ₦'+row.leaseRent.toLocaleString()+'.',day);
 }else if(op==='sleep'){
  const week=Math.floor((day-1)/7);
  if(a.robberyWeek!==week){a.robberyWeek=week;const rate=a.activeHomeId==='wealthy-estate-home'?0:homes.some(p=>p.id===a.activeHomeId) ? .05 : input.starterHomeId?.startsWith('northern-estate-') ? .15 : 0;
   if(rate&&random()<rate&&cash>0){const percent=10+Math.floor(random()*66),stolen=Math.min(Math.floor(cash),Math.max(1,Math.floor(cash*percent/100)));debit(stolen,'HOME ROBBERY');message(a,'Home robbery: ₦'+stolen.toLocaleString()+' stolen ('+percent+'% of carried cash). Bank savings are safe.',day);}
  }
 }else if(op!=='status')throw Error('Unknown housing action.');
 return housingView(db,id);
}
