import {payWeeklyRent,paySchoolFees,payFamilyRequest} from '../game-rules/life/systems/lifeObligations.js';
import {LIFE_OBLIGATION_CONFIG as lifeConfig} from '../game-rules/life/data/lifeObligations.js';
import {claimObjectiveReward} from '../game-rules/progression/systems/objectiveSystem.js';
import {OBJECTIVE_DEFINITIONS} from '../game-rules/progression/data/objectives.js';
import {account,cash,audit,requireCash,dayOf,minuteOf,progress,FINANCIAL_FIELDS} from './authority.js';
import * as economy from '../game-rules/economy/systems/danfoEconomy.js';
import * as savings from '../game-rules/economy/systems/bankSavings.js';
import * as stocks from '../game-rules/economy/systems/stockMarket.js';
import * as business from '../game-rules/business/systems/businessSystem.js';
import {applyCustomization} from '../game-rules/customization/state.js';
import {PURCHASABLE_CARS} from '../game-rules/player/data/purchasableCars.js';
import {FOOD_ITEMS,PLAYER_STATUS_CONFIG as health} from '../game-rules/player/data/playerStatus.js';
import {DANFO_ECONOMY_CONFIG as config} from '../game-rules/economy/data/danfoEconomyConfig.js';
import {createMotoEaziState,waitForMotoEaziRequest,acceptMotoEaziRequest,updateMotoEaziJob,updateMotoEaziOffers,rejectMotoEaziRequest} from '../game-rules/motoEazi/systems/motoEaziJobs.js';
import {MOTO_EAZI_REQUESTS} from '../game-rules/motoEazi/data/motoEaziRequests.js';
import {readFileSync} from 'node:fs';
import {settleTransportRoute,settleTransportStop} from './transport.js';
const zones=JSON.parse(readFileSync(new URL('./locations.json',import.meta.url),'utf8'));
const amount=x=>{if(!Number.isSafeInteger(x)||x<=0||x>1e12)throw Error('Enter a positive whole-naira amount.');return x;};
function at(p,kind){return zones.find(z=>z.kind===kind&&p&&Math.abs(p.speed)<2&&p.x>=z.x-30&&p.x<=z.x+z.width+30&&p.y>=z.y-30&&p.y<=z.y+z.height+30);}
function needPlace(p,kind){const z=at(p,kind);if(!z)throw Error('Park at the correct service location first.');return z;}
export function observeEconomyLocation(db,id,pose){
 const w=account(db,id);
 if(at(pose,'businessOfficeParkingZones'))progress(w,'business-office-visited');
 if(at(pose,'estateAgencyParkingZones'))progress(w,'estate-agency-visited');
}
export function economyAction(db,input){
 const w=account(db,input.playerId),s=w.state,e=s.economyState,p=input.serverPose,op=input.op;
 const before=e.money,beforeTransaction=e.nextTransactionNumber,beforeExpenses=e.totalExpenses;let result={success:true},taxable=false,label=op,marketContext={};const events=[];
 const check=r=>{if(!r?.success)throw Error('Action unavailable or insufficient funds.');return r;};
 if(op==='status')return result;
 if(op==='day-close'){
  const closedDay=Math.max(1,Math.floor(Number(input.closedDay)||0));
  const financial=input.financialState;
  if(!financial||typeof financial!=='object')throw Error('Missing day-end financial state.');
  if(!Number.isFinite(financial.economyState?.money)||Math.abs(financial.economyState.money)>1e12)throw Error('Invalid closing balance.');
  for(const key of FINANCIAL_FIELDS){
   if(financial[key]===undefined)throw Error('Incomplete day-end financial state.');
   s[key]=structuredClone(financial[key]);
  }
  s.economyState.money=Math.round(s.economyState.money);
  if(Math.round(Number(input.closingBalance))!==s.economyState.money)throw Error('Closing balance mismatch.');
  // One trusted daily checkpoint replaces all ordinary daytime economy calls.
  // Advance the server clock to the start of the next game day if needed.
  w.originMinute=Math.max(w.originMinute,closedDay*1440);
  result={success:true,closedDay,closingBalance:s.economyState.money};
  Object.assign(db.profiles[input.playerId],{
   money:s.economyState.money,
   owned_vehicle_ids:['starter-danfo',...new Set(s.economyState.ownedVehicleIds||[])],
   inventory:structuredClone(s.playerInventory||{}),
   customization:structuredClone(s.customizationState||{}),
   updated_at:new Date().toISOString(),
  });
  label='DAY END ECONOMY SYNC';
 }
 else if(op==='transport-stop')return settleTransportStop(w,input);
 else if(op==='transport-route')return settleTransportRoute(w,input);
 else if(op==='ui-progress'){
  if(!['welcome-read','find-job-opened'].includes(input.event))throw Error('This event requires server evidence.');
  progress(w,input.event);
 }else if(op==='claim-objective'){
  const reward=claimObjectiveReward(s.objectiveState,input.objectiveId,OBJECTIVE_DEFINITIONS);if(!reward)throw Error('Complete this objective before claiming its reward.');e.money+=reward.money||0;label='OBJECTIVE REWARD';
 }else if(op==='rent'){
  const life=s.lifeObligationState;if(!['due','grace','overdue'].includes(life.rent.status))throw Error('No rent is due.');const cost=life.rent.amount+life.rent.lateFee;requireCash(w,cost);e.money-=payWeeklyRent({state:life,currentDay:dayOf(w)});events.push('rent-paid');label='weekly-rent';
 }else if(op==='school-fees'||op==='family-request'){
  const n=amount(input.amount);result=check(op==='school-fees'?paySchoolFees({state:s.lifeObligationState,requestedAmount:n,currentDay:dayOf(w)}):payFamilyRequest({state:s.lifeObligationState,requestedAmount:n,currentDay:dayOf(w),config:lifeConfig}));requireCash(w,result.amount);e.money-=result.amount;
  if(result.completed&&op==='school-fees')events.push('school-fees-paid');
  if(result.reward?.type==='food')s.playerInventory.items[result.reward.itemId]=(s.playerInventory.items[result.reward.itemId]||0)+result.reward.quantity;
  if(result.reward?.type==='coupon')s.lifeObligationState.discountCoupons+=result.reward.quantity;
 }else if(op==='fines'){
  const report=db.careers?.[input.playerId]?.report;const cost=Math.round(report?.fines||0);if(cost<=0)throw Error('No recorded fines to pay.');requireCash(w,cost);e.money-=cost;report.fines=0;events.push('fines-cleared');
 }else if(op==='police-bribe'){
  const report=db.careers?.[input.playerId]?.report,heist=db.heists?.accounts[input.playerId];
  if(['loading','escape'].includes(heist?.status)||heist?.custody)throw Error('This arrest must be resolved at the station.');
  if(!p||!report||report.crime<50)throw Error('No recorded arrest to resolve.');
  const cost=Math.max(5000,Math.round(report.crime*100));requireCash(w,cost);e.money-=cost;report.crime=heist?.lockUntil>minuteOf(w)?100:0;
 }else if(op==='driving-test'){
  needPlace(p,'drivingSchoolParkingZones');requireCash(w,1000);e.money-=1000;
 }else if(op==='hospital-emergency'){
  if(!p)throw Error('Connect to the city first.');const cost=health.faintHospitalCost;
  if(e.money<cost)economy.addEmergencyBankLoan({economyState:e,amount:cost-e.money,config});e.money-=cost;label='hospital-emergency';
 }else if(op==='deposit'){const n=amount(input.amount);requireCash(w,n);savings.depositIntoSavings(s.bankSavingsState,e,n);}
 else if(op==='withdraw'){const n=amount(input.amount);if(n>s.bankSavingsState.balance)throw Error('Insufficient savings.');savings.withdrawFromSavings(s.bankSavingsState,e,n);}
 else if(op==='buy-stock'){const price=stocks.buyStock(s.stockMarketState,input.companyId,e.money);if(!price)throw Error('Stock purchase unavailable.');e.money-=price;}
 else if(op==='sell-stock'){const basis=(s.stockMarketState.investedPrincipal[input.companyId]||0)/Math.max(1,s.stockMarketState.holdings[input.companyId]||0);const proceeds=stocks.sellStock(s.stockMarketState,input.companyId);if(!proceeds)throw Error('You do not own this stock.');e.money+=proceeds;const profit=Math.max(0,proceeds-basis),week=Math.floor((dayOf(w)-1)/7);w.income[week]=(w.income[week]||0)+profit;}
 else if(op==='subscribe-adviser'){const price=stocks.subscribeStockAdviser(s.stockMarketState,dayOf(w),e.money);if(price===null)throw Error('Insufficient money.');e.money-=price;}
 else if(op==='cancel-adviser')stocks.cancelStockAdviser(s.stockMarketState,dayOf(w));
 else if(op==='read-adviser')s.stockMarketState.adviser.readThrough=s.stockMarketState.adviser.nextId-1;
 else if(op==='quick-loan')result=check(economy.borrowQuickLoan({economyState:e,config}));
 else if(op==='bank-loan'){needPlace(p,'bankParkingZones');result=check(economy.borrowBankLoan({economyState:e,amount:amount(input.amount),atBank:true,config}));}
 else if(op==='repay-loan')result=check(economy.repayBankLoan({economyState:e,amount:amount(input.amount),receiver:'bank',loanType:input.loanType==='bank'?'bank':'quick',config}));
 else if(op==='vehicle'){needPlace(p,'dealershipParkingZones');result=check(economy.purchasePlayerVehicle({economyState:e,vehicle:PURCHASABLE_CARS.find(v=>v.id===input.vehicleId),atDealership:true,config}));}
 else if(op==='customize'){
  if(input.kind!=='phone'&&input.vehicleId!=='starter-danfo'&&!e.ownedVehicleIds.includes(input.vehicleId))throw Error('You do not own that vehicle.');
  result=applyCustomization(s.customizationState,input.vehicleId||'starter-danfo',input.kind,input.id,e.money);if(!result.ok)throw Error('Cosmetic unavailable or insufficient money.');e.money-=result.price;
 }else if(op==='food'){
  const zone=needPlace(p,'foodParkingZones'),item=FOOD_ITEMS.find(i=>i.id===input.itemId);if(!item||!item.sellers.includes(zone.sellerType))throw Error('This seller does not stock that item.');requireCash(w,item.price);e.money-=item.price;label='food-purchase';marketContext.foodSeller=zone.sellerType;s.playerInventory.items[item.id]=(s.playerInventory.items[item.id]||0)+1;
 }else if(op==='consume'){
  const item=FOOD_ITEMS.find(i=>i.id===input.itemId);if(!item||(s.playerInventory.items[item.id]||0)<1)throw Error('You do not own this item.');s.playerInventory.items[item.id]--;result.itemId=item.id;events.push('energy-restored');
 }else if(op==='business-office'){
  needPlace(p,'businessOfficeParkingZones');result=check(business.purchaseBusinessOffice({state:s.businessState,money:e.money,currentDay:dayOf(w),ownedPropertyIds:s.propertyState.ownedPropertyIds}));e.money-=result.amount;
 }else if(op==='business-asset'){result=check(business.purchaseBusinessAsset({state:s.businessState,assetId:input.assetId,money:e.money}));e.money-=result.amount;}
 else if(op==='fuel'||op==='roadside-fuel'){
  if(op==='fuel')needPlace(p,'fuelPumps');else if(!p)throw Error('Connect to the city first.');
  marketContext.fuelPump=op==='fuel'?at(p,'fuelPumps').id:null;label=op==='fuel'?'fuel-purchase':'roadside-fuel-delivery';
  const current=Math.max(0,Math.min(100,Number(input.currentFuel)||0));
  const litres=op==='roadside-fuel'?Math.min(10,(100-current)/2):input.litres==='full'?'full':Math.max(0,Math.min(50,Number(input.litres)||0));
  result=check(economy.purchaseFuel({economyState:e,currentFuel:current,requestedLitres:litres,discountRate:input.useCoupon&&s.lifeObligationState.discountCoupons>0?0.5:0,config}));if(input.useCoupon&&s.lifeObligationState.discountCoupons>0)s.lifeObligationState.discountCoupons--;if(current<=25)events.push('low-fuel-refuelled');
  if(op==='roadside-fuel'){const distance=Math.min(...zones.filter(z=>z.kind==='fuelPumps').map(z=>Math.hypot(p.x-z.x-60,p.y-z.y-60)/120));const fee=Math.round(1200+distance*75);requireCash(w,fee);e.money-=fee;}
 }else if(op==='repair'){
  if(!p)throw Error('Connect to the city first.');result=check(economy.purchaseRepairs({economyState:e,currentDamage:Math.max(0,Math.min(100,Number(input.damage)||0)),mobileCallout:!at(p,'repairZones'),discountRate:input.useCoupon&&s.lifeObligationState.discountCoupons>0?0.5:0,config}));if(input.useCoupon&&s.lifeObligationState.discountCoupons>0)s.lifeObligationState.discountCoupons--;events.push('vehicle-repaired');
 }else if(op==='car-part'){requireCash(w,12000);e.money-=12000;s.propertyState.starterHomeRisk.missingCarPart=false;}
 else if(op==='health'){
  const zone=input.mobile?null:needPlace(p,'healthParkingZones');const cost=input.mobile?health.doctorCallCost:zone.providerType==='public-hospital'?health.publicHospitalCost:health.privateClinicCost;const coupon=!!input.useCoupon&&s.lifeObligationState.discountCoupons>0;const price=Math.round(cost*(coupon?0.5:1));requireCash(w,price);e.money-=price;if(coupon)s.lifeObligationState.discountCoupons--;result.health=100;label=input.mobile?'mobile-doctor-treatment':'medical-treatment';if(zone?.providerType==='public-hospital')label='hospital-emergency';events.push('health-restored');
 }else if(op==='moto-offer'){
  w.moto ||= createMotoEaziState();if(!w.moto.activeRequest)waitForMotoEaziRequest(w.moto,MOTO_EAZI_REQUESTS,minuteOf(w)%1440);for(let i=0;i<3;i++)updateMotoEaziOffers({state:w.moto,requests:MOTO_EAZI_REQUESTS,deltaSeconds:10});result.moto=w.moto;
 }else if(op==='moto-accept'){
  w.moto ||= createMotoEaziState();if(!p||!e.ownedVehicleIds.includes(p.vehicleId)||p.vehicleId.includes('danfo')||p.vehicleId.includes('brt'))throw Error('Use your owned personal car.');
  if(!w.moto.offers.some(o=>o.id===input.requestIdForRide)||!acceptMotoEaziRequest(w.moto,input.requestIdForRide))throw Error('Ride unavailable.');result.moto=w.moto;
 }else if(op==='moto-reject'){if(w.moto)rejectMotoEaziRequest(w.moto,input.requestIdForRide);result.moto=w.moto;
 }else if(op==='moto-tick'){
  if(!w.moto||!p||!e.ownedVehicleIds.includes(p.vehicleId)||p.vehicleId.includes('danfo')||p.vehicleId.includes('brt'))throw Error('Use your personal car for this ride.');
  const delta=Math.min(10,Math.max(0,(Date.now()-(w.motoPulse||Date.now()))/1000));w.motoPulse=Date.now();
  result.event=updateMotoEaziJob({state:w.moto,vehicle:p,speedKmh:Math.abs(p.speed),deltaSeconds:delta});result.moto=w.moto;
  if(result.event?.type==='request-complete'){e.money+=result.event.fare;taxable=true;label='MOTO EAZI FARE';}
 }else throw Error('Unsupported online economy action.');
 if(e.money!==before){
  const delta=Math.round(e.money-before);
  if(e.nextTransactionNumber===beforeTransaction)economy.recordLedgerTransaction(e,{type:op,label:label.toUpperCase(),amount:Math.abs(delta),direction:delta>0?'income':'expense'});
  if(delta<0&&op!=='deposit'&&e.totalExpenses===beforeExpenses)e.totalExpenses-=delta;
  audit(w,delta,label,taxable);
 }else w.version++;
 if(e.money<before)stocks.recordStockTransaction(s.stockMarketState,{type:op==='repay-loan'?'loan-repayment':label,amount:before-e.money,direction:'expense',label,interestPaid:op==='repay-loan'?e.lastTransaction?.interestPaid:0,marketEventId:'purchase-'+(w.ledgerCount??w.ledger.length)},{day:dayOf(w),...marketContext});
 const actionEvents={'vehicle':'vehicle-purchased','business-office':'business-office-purchased','business-asset':input.assetId==='fleet-danfo'?'business-danfo-purchased':'business-lease-car-purchased','bank-loan':'loan-taken','quick-loan':'loan-taken'};if(actionEvents[op])events.push(actionEvents[op]);if(op==='repay-loan'&&e.loanBalance<=0)events.push('loan-repaid');for(const event of events)progress(w,event);
 return result;
}
