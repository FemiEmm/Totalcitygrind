import {createLifeObligationState,processLifeObligationDay,activateSchoolFees} from '../game-rules/life/systems/lifeObligations.js';
import {LIFE_OBLIGATION_CONFIG as lifeConfig} from '../game-rules/life/data/lifeObligations.js';
import {createObjectiveState,recordObjectiveEvent} from '../game-rules/progression/systems/objectiveSystem.js';
import {OBJECTIVE_DEFINITIONS} from '../game-rules/progression/data/objectives.js';
import {createDailyQuestState,recordDailyQuestEvent,syncDailyQuestDay} from '../game-rules/dailyQuests/systems/dailyQuestSystem.js';
import {createMotoEaziState} from '../game-rules/motoEazi/systems/motoEaziJobs.js';
import {createDanfoEconomyState,creditIncome,chargeExpense} from '../game-rules/economy/systems/danfoEconomy.js';
import {DANFO_ECONOMY_CONFIG as config} from '../game-rules/economy/data/danfoEconomyConfig.js';
import {createBankSavingsState,processBankSavingsDay} from '../game-rules/economy/systems/bankSavings.js';
import {createStockMarketState,updateStockMarketForDay,recordStockTransaction,sampleMarketDeposits} from '../game-rules/economy/systems/stockMarket.js';
import {createCustomizationState} from '../game-rules/customization/state.js';
import {createBusinessState,processBusinessDay} from '../game-rules/business/systems/businessSystem.js';
import {createPropertyState} from '../game-rules/property/systems/propertySystem.js';
import {readFileSync} from 'node:fs';
const catalogue=JSON.parse(readFileSync(new URL('../passengers/catalogue.json',import.meta.url),'utf8'));
export const FINANCIAL_FIELDS=['economyState','bankSavingsState','stockMarketState','customizationState','playerInventory','propertyState','businessState','lifeObligationState','objectiveState','dailyQuestState'];
export function account(db,id){
 db.wallets ||= {};if(db.wallets[id])return db.wallets[id];
 const saved=db.gameStates?.[id]?.snapshot||{},profile=db.profiles[id];
 const day=Math.max(1,saved.gameClock?.day||1),minute=(day-1)*1440+(saved.gameClock?.minuteOfDay||420);
 const state={economyState:createDanfoEconomyState(config,day),bankSavingsState:createBankSavingsState(day),stockMarketState:createStockMarketState(),customizationState:createCustomizationState(),playerInventory:{items:profile.inventory?.items||{}},propertyState:createPropertyState(),businessState:createBusinessState(day),lifeObligationState:createLifeObligationState(lifeConfig),objectiveState:createObjectiveState(OBJECTIVE_DEFINITIONS),dailyQuestState:createDailyQuestState(day)};
 for(const key of FINANCIAL_FIELDS)if(saved[key])state[key]=structuredClone(saved[key]);
 state.economyState.money=Number.isFinite(profile.money)?Math.round(profile.money):0;
 state.economyState.ownedVehicleIds=[...new Set(profile.owned_vehicle_ids||state.economyState.ownedVehicleIds||[])].filter(id=>id!=='starter-danfo'&&id!=='player-brt'&&!id.startsWith('service-'));
 state.propertyState.playerName=profile.display_name||'Driver';
 const applied={career:saved.careerLocal?.lastReceipt||0,housing:saved.housingLocal?.lastReceipt||0,heist:saved.heistLocal?.lastReceipt||0,club:saved.clubLocal?.lastReceipt||0,government:saved.governmentLocal?.lastReceipt||0,passengers:saved.passengerPopulationLocal?.ack||0};
 const w=db.wallets[id]={version:1,state,applied,requests:{},income:{},ledger:[],originMinute:minute,housingStarted:!!profile.progression?.housingStarted,migratedAt:new Date().toISOString()};
 w.state.stockMarketState.lastUpdatedDay=day;w.state.bankSavingsState.lastProcessedDay=day;w.state.businessState.lastProcessedDay=day;
 return w;
}
export const minuteOf=w=>w.originMinute;
export const dayOf=w=>Math.floor(minuteOf(w)/1440)+1;
export function audit(w,amount,label,taxable=amount>0){
 if(!Number.isSafeInteger(amount)||Math.abs(amount)>1e12)throw Error('Invalid server transaction.');
 const seedReceipts=!Array.isArray(w.recentTransactions);
 w.recentTransactions ||= structuredClone(w.state.economyState.transactions||[]);
 const direction=amount<0?'expense':'income';
 const duplicate=w.recentTransactions.findIndex(t=>t.label===label&&t.direction===direction&&t.amount===Math.abs(amount)&&Date.now()-t.createdAt<1000);
 if(seedReceipts&&duplicate>=0)w.recentTransactions.splice(duplicate,1);
 w.ledgerCount=(w.ledgerCount??w.ledger.length)+1;
 if(amount)w.recentTransactions.unshift({id:'server-ledger-'+w.ledgerCount,type:'server-ledger',label,amount:Math.abs(amount),direction,createdAt:Date.now()});
 w.recentTransactions=w.recentTransactions.slice(0,100);
 w.ledger.push({id:w.ledgerCount,at:Date.now(),amount,label,cash:w.state.economyState.money,savings:w.state.bankSavingsState.balance});w.version++;
 if(taxable&&amount>0&&!label.startsWith('DAILY QUEST'))progress(w,'income-earned',amount);
 if(taxable&&amount>0){const week=Math.floor((dayOf(w)-1)/7);w.income[week]=(w.income[week]||0)+amount;}

}
export function progress(w,type,amount=1){
 const day=dayOf(w),s=w.state;
 const result=recordObjectiveEvent({state:s.objectiveState,definitions:OBJECTIVE_DEFINITIONS,type,amount,currentDay:day});
 for(const quest of recordDailyQuestEvent(s.dailyQuestState,type,amount,day)){
  const entry=s.dailyQuestState.entries.find(e=>e.id===quest.id);if(entry.rewardPaid)continue;entry.rewardPaid=true;cash(w,quest.reward,'DAILY QUEST - '+quest.title,false);
 }
 if(result.completedIds.includes('new-arrival-sleep')&&activateSchoolFees({state:s.lifeObligationState,currentDay:day,config:lifeConfig}))progress(w,'school-fees-requested');
 w.version++;return result;
}
export function cash(w,amount,label,taxable=amount>0){
 amount=Math.round(amount);if(!amount)return;
 const economyState=w.state.economyState;
 if(amount>0)creditIncome({economyState,amount,type:'server-income',label,config});
 else chargeExpense({economyState,amount:-amount,type:'server-expense',label,config});
 audit(w,amount,label,taxable);
 const type=/MORTGAGE/.test(label)?'property-mortgage':/PURCHASE/.test(label)?'property-purchase':/HOUSE RENT/.test(label)?'weekly-rent':null;
 if(type&&amount<0)recordStockTransaction(w.state.stockMarketState,{type,label,amount:-amount,direction:'expense',marketEventId:'receipt-'+(w.ledgerCount??w.ledger.length)},{day:dayOf(w)});
}
export function requireCash(w,amount){if(!Number.isSafeInteger(amount)||amount<0||w.state.economyState.money<amount)throw Error('Not enough money.');}
function consume(w,kind,rows,convert=r=>({amount:r.amount,label:r.label,savings:r.savings||0})){
 for(const r of rows||[]){if(r.id<=w.applied[kind])continue;const v=convert(r);cash(w,v.amount,v.label);if(v.savings){w.state.bankSavingsState.balance+=v.savings;audit(w,Math.round(v.savings),'SAVINGS '+v.label,false);}w.applied[kind]=r.id;}
}
export function settle(db){
 for(const id of Object.keys(db.profiles)){
  const w=account(db,id),state=w.state,day=dayOf(w);
  syncDailyQuestDay(state.dailyQuestState,day);
  const tenancy=Object.values(db.homes||{}).find(h=>h.playerId===id);
  if(tenancy)state.lifeObligationState.rent.amount=tenancy.weeklyRent;
  if(db.housing?.accounts[id]?.activeHomeId&&db.housing.accounts[id].activeHomeId!=='starter-rental')state.lifeObligationState.rent.status='owned';
  else if(state.lifeObligationState.rent.status==='owned')state.lifeObligationState.rent.status='current';
  for(const event of processLifeObligationDay({state:state.lifeObligationState,currentDay:day,config:lifeConfig}))progress(w,event);
  // Daily work fees are charged only for days actually worked, never every offline day.
  w.workDays ||= {};
  for(const [workedDay,job] of Object.entries(w.workDays))if(Number(workedDay)<day){cash(w,-(job==='brt'?config.dailyBrtTax:config.dailyGarageFee+config.dailyCarOwnerFee),'DAILY WORK FEES',false);delete w.workDays[workedDay];}
  state.economyState.lastProcessedDay=day;
  consume(w,'career',db.careers?.[id]?.receipts);
  consume(w,'housing',db.housing?.accounts[id]?.receipts);
  consume(w,'heist',db.heists?.accounts[id]?.receipts);
  consume(w,'club',db.club?.accounts[id]?.receipts,r=>({amount:-r.price,label:'CLUB DRINK',savings:0}));
  consume(w,'government',db.government?.accounts[id]?.receipts);
  const before=state.bankSavingsState.balance;processBankSavingsDay(state.bankSavingsState,day);if(state.bankSavingsState.balance>before)audit(w,state.bankSavingsState.balance-before,'SAVINGS INTEREST');
  const business=processBusinessDay({state:state.businessState,currentDay:day});if(business?.profit){cash(w,business.profit,'BUSINESS PROFIT');progress(w,'business-profit-earned',business.profit);}
  sampleMarketDeposits(state.stockMarketState,day,minuteOf(w)%1440,state.bankSavingsState.balance);
  updateStockMarketForDay(state.stockMarketState,day,cost=>{if(state.economyState.money<cost)return false;cash(w,-cost,'STOCK ADVISER RENEWAL',false);return true;});
  const housing=db.housing?.accounts[id];if(housing){state.propertyState.ownedPropertyIds=Object.entries(db.housing.homes).filter(([,h])=>h.ownerId===id).map(([key])=>key);state.propertyState.activeHomeId=housing.activeHomeId;state.propertyState.mortgage=structuredClone(housing.mortgage);}
  state.economyState.loanOfferReceived=day>=config.loanOfferDay;state.economyState.bankLoanEligible=day>=config.bankLoanOfferDay;
  Object.assign(db.profiles[id],{money:state.economyState.money,owned_vehicle_ids:['starter-danfo',...state.economyState.ownedVehicleIds],inventory:structuredClone(state.playerInventory),customization:structuredClone(state.customizationState)});
 }
}
export function walletView(w){return {version:w.version,transactions:structuredClone(w.recentTransactions||w.state.economyState.transactions||[]),state:structuredClone(w.state),moto:structuredClone(w.moto||createMotoEaziState()),minute:minuteOf(w),day:dayOf(w)};}
export function protectSnapshot(db,id,snapshot){
 const w=account(db,id);const clean=structuredClone(snapshot);
 if(clean.currentMapId==='coastal-city')throw Error('Coast City is locked.');
 delete clean.world2State;
 for(const key of FINANCIAL_FIELDS)clean[key]=structuredClone(w.state[key]);
 clean.propertyState.starterHomeId=db.profiles[id].progression?.homeId;
 clean.gameClock={...(clean.gameClock||{}),day:dayOf(w),minuteOfDay:minuteOf(w)%1440};
 for(const kind of ['career','housing','heist','club','government'])clean[kind+'Local']={...(clean[kind+'Local']||{}),lastReceipt:w.applied[kind]};
 clean.motoEaziState=structuredClone(w.moto||createMotoEaziState());
 clean.careerState=structuredClone(db.careers?.[id]||{});
 clean.governmentLocal={...clean.governmentLocal,income:structuredClone(w.income)};
 return clean;
}
