import { STOCK_COMPANIES, STOCK_ADVISER_PRICE, STOCK_ADVISER_DAYS } from '../data/stockMarket.js';
import { isTransactionLocked } from '../../security/transactionLock.js';
const company = id => STOCK_COMPANIES.find(c => c.id === id);
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const dayNumber = value => Math.max(1, Math.floor(number(value)));
const fields = fn => Object.fromEntries(STOCK_COMPANIES.map(c => [c.id,fn(c)]));
export function createStockMarketState() {
  return { version:2, lastUpdatedDay:1, prices:fields(c=>c.openingPrice), previousPrices:fields(c=>c.openingPrice), holdings:fields(()=>0), investedPrincipal:fields(()=>0), performance:fields(()=>({smoothedProfit:0,profit:0,revenue:0,costs:0})), daily:{}, receipts:{}, deposits:{time:null,balance:0}, adviser:{autoRenew:false,paymentPending:false,untilDay:0,messages:[],nextId:1,readThrough:0} };
}
export function restoreStockMarketState(state,saved={}) {
  saved=saved??{};
  const clean=createStockMarketState();
  clean.lastUpdatedDay=dayNumber(saved.lastUpdatedDay);
  for(const c of STOCK_COMPANIES) {
    clean.prices[c.id]=Math.max(25,Math.round(number(saved.prices?.[c.id]))||c.openingPrice);
    clean.previousPrices[c.id]=Math.max(25,number(saved.previousPrices?.[c.id])||clean.prices[c.id]);
    clean.holdings[c.id]=Math.max(0,Math.floor(number(saved.holdings?.[c.id])));
    clean.investedPrincipal[c.id]=Math.max(0,saved.investedPrincipal?.[c.id]==null?clean.holdings[c.id]*clean.prices[c.id]:number(saved.investedPrincipal[c.id]));
    if(saved.version===2) clean.performance[c.id]={...clean.performance[c.id],...saved.performance?.[c.id]};
  }
  if(saved.version===2) {
    clean.daily=saved.daily??{};clean.receipts=saved.receipts??{};
    clean.deposits={...clean.deposits,...saved.deposits};
    clean.adviser={...clean.adviser,...saved.adviser,messages:Array.isArray(saved.adviser?.messages)?saved.adviser.messages.slice(-60):[]};
  }
  clean.adviser.autoRenew = saved.adviser?.autoRenew ?? (clean.adviser.untilDay > clean.lastUpdatedDay);
  Object.assign(state,clean);
}
function ledger(state,day,id) {
  state.daily[day]??={};
  state.daily[day][id]??={revenue:0,costs:0,depositMinutes:0};
  return state.daily[day][id];
}
export function sampleMarketDeposits(state,day,minute,balance) {
  const time=(dayNumber(day)-1)*1440+clamp(number(minute),0,1439.999);
  let previous=state.deposits.time;
  if(previous!==null&&time>=previous) {
    while(previous<time) {
      const d=Math.floor(previous/1440)+1,end=Math.min(time,d*1440);
      if(d>=state.lastUpdatedDay) ledger(state,d,'megapay').depositMinutes+=(end-previous)*state.deposits.balance;
      previous=end;
    }
  }
  state.deposits={time,balance:Math.max(0,number(balance))};
}
// Receipts contribute cash value, never a bonus per transaction. Replays are ignored.
// Future refunds must reference the original receipt and cannot exceed its value.
export function recordMarketActivity(state,{id,companyId,amount,day,cost=false,refundOf=null}) {
  if(!id||state.receipts[id])return false;
  const d=Math.max(state.lastUpdatedDay,dayNumber(day));
  let value=Math.max(0,number(amount));
  let c=company(companyId);
  if(refundOf) {
    const original=state.receipts[refundOf];
    if(!original||original.cost||original.refundOf)return false;
    c=company(original.companyId);value=Math.min(value,original.amount-original.refunded);
    if(!c||value<=0)return false;
    original.refunded+=value;
  }
  if(!c||value<=0)return false;
  const entry=ledger(state,d,c.id);
  const sign=refundOf?-1:1;
  if(cost)entry.costs+=value;
  else {entry.revenue+=sign*value;entry.costs+=sign*value*(1-c.margin);}
  state.receipts[id]={companyId:c.id,amount:value,refunded:0,cost,refundOf,day:d};
  return true;
}
export function recordStockTransaction(state,event,context) {
  const {type,amount,direction}=event;
  const input={id:event.marketEventId,amount,day:context.day};
  if(type==='food-purchase') {
    const id=context.foodSeller==='supermarket'?'kilobeat':context.foodSeller==='restaurant'?'cquence':null;
    if(id)recordMarketActivity(state,{...input,companyId:id});
  } else if(type==='fuel-purchase') {
    const technopack=/^(residential|work)-pump-/.test(context.fuelPump??'');
    recordMarketActivity(state,{...input,companyId:technopack?'technopack':'gidi'});
  } else if(type==='roadside-fuel-delivery') recordMarketActivity(state,{...input,companyId:'gidi'});
  else if(['medical-treatment','mobile-doctor-treatment','hospital-emergency'].includes(type)) {
    recordMarketActivity(state,{...input,companyId:type==='hospital-emergency'||String(event.label).includes('ABULE EGBA HOSPITAL')?'technopack':'gidi'});
  } else if(['property-purchase','property-deposit','property-mortgage','weekly-rent'].includes(type)) recordMarketActivity(state,{...input,companyId:'seventomi'});
  else if(type==='savings-expense'&&/PROPERTY|MORTGAGE/.test(event.label??'')) recordMarketActivity(state,{...input,companyId:'seventomi'});
  else if(type==='loan-repayment'&&event.interestPaid>0) recordMarketActivity(state,{...input,amount:event.interestPaid,companyId:'megapay'});
  else if(type==='savings-interest') recordMarketActivity(state,{...input,companyId:'megapay',cost:true});
}
function adviserMessage(state,day,text) {
  state.adviser.messages.push({id:state.adviser.nextId++,day,text});
  state.adviser.messages=state.adviser.messages.slice(-60);
}
export function subscribeStockAdviser(state,day,money) {
  if (isTransactionLocked()) return null;
  const current=dayNumber(day);
  if (state.adviser.untilDay > current) {
    if (state.adviser.autoRenew) return null;
    state.adviser.autoRenew = true;
    adviserMessage(state,current,'Automatic renewal enabled. Your next seven-day payment is due on day '+state.adviser.untilDay+'. Cancel any time in Messages > Stock Adviser.');
    return 0;
  }
  if(number(money)<STOCK_ADVISER_PRICE)return null;
  state.adviser.autoRenew = true;
  state.adviser.paymentPending = false;
  state.adviser.untilDay=current+STOCK_ADVISER_DAYS;
  adviserMessage(state,current,'Subscription active for seven game days. I will send daily rising and falling stock updates. Advice follows recent business performance; it cannot guarantee the next price. Renews automatically every seven game days for 1,000 naira until you cancel in Messages > Stock Adviser.');
  return STOCK_ADVISER_PRICE;
}
export function cancelStockAdviser(state,day) {
  if (!state.adviser.autoRenew) return;
  state.adviser.autoRenew = false;
  state.adviser.paymentPending = false;
  const access = state.adviser.untilDay > dayNumber(day) ? 'Your adviser stays active until day '+state.adviser.untilDay+'. ' : 'Your paid period has already ended. ';
  adviserMessage(state,dayNumber(day),'Automatic renewal cancelled. '+access+'No further subscription payments will be taken.');
}
export function updateStockMarketForDay(state,currentDay,payRenewal = () => false) {
  const target=dayNumber(currentDay);
  while(state.lastUpdatedDay<target) {
    const day=state.lastUpdatedDay,next=day+1;
    if (state.adviser.autoRenew && next >= state.adviser.untilDay) {
      if (payRenewal(STOCK_ADVISER_PRICE)) {
        state.adviser.untilDay = next + STOCK_ADVISER_DAYS;
        state.adviser.paymentPending = false;
        adviserMessage(state,next,'Stock Adviser renewed: 1,000 naira paid for seven game days. Next renewal: day '+state.adviser.untilDay+'. Cancel in Messages > Stock Adviser any time.');
      } else if (!state.adviser.paymentPending) {
        state.adviser.paymentPending = true;
        adviserMessage(state,next,'Not enough cash to renew Stock Adviser. Updates are paused. I will retry once each game day; cancel in Messages > Stock Adviser to stop renewal attempts.');
      }
    }
    for(const c of STOCK_COMPANIES) {
      const entry=state.daily[day]?.[c.id]??{revenue:0,costs:0,depositMinutes:0};
      // Retained savings fund a simulated loan book. In/out churn earns nothing.
      const fundingIncome=c.id==='megapay'?number(entry.depositMinutes)/1440*.004:0;
      const revenue=number(entry.revenue)+fundingIncome,costs=number(entry.costs)+c.overhead;
      const profit=revenue-costs,previous=number(state.performance[c.id].smoothedProfit);
      const smooth=.65*previous+.35*profit;
      const movement=clamp(.035*Math.tanh(smooth/c.targetProfit)+.015*Math.tanh((smooth-previous)/c.targetProfit),-.05,.05);
      const price=state.prices[c.id];
      state.previousPrices[c.id]=price;
      state.prices[c.id]=clamp(Math.round(price*(1+movement)),Math.max(25,Math.ceil(price*.95)),Math.floor(price*1.05));
      state.performance[c.id]={smoothedProfit:smooth,profit,revenue,costs};
      const change=(state.prices[c.id]-price)/price*100;
      if(!state.adviser.paymentPending&&next<=state.adviser.untilDay&&Math.abs(change)>=.5) {
        adviserMessage(state,next,c.name+' is '+(change>0?'rising':'falling')+' ('+(change>0?'+':'')+change.toFixed(1)+'%) after the latest daily update. '+(change>0?'Business performance is improving; consider buying if it suits your portfolio.':'Business performance is weakening; consider selling or reducing your holding.')+' This is a trend signal, not a guarantee.');
      }
    }
    if(next===state.adviser.untilDay&&!state.adviser.autoRenew)adviserMessage(state,next,'Your paid Stock Adviser period has ended. No renewal payment was taken. Subscribe again in Messages > Stock Adviser whenever you like.');
    delete state.daily[day];state.lastUpdatedDay=next;
    // Refund/replay window is 30 game days; game code never replays old ledger history.
    for(const [id,receipt] of Object.entries(state.receipts))if(receipt.day<next-30)delete state.receipts[id];
  }
  return {totalPayout:0,payouts:[]};
}
export function getStockMarketView(state) {
  return STOCK_COMPANIES.map(c=>{
    const price=state.prices[c.id],previousPrice=state.previousPrices[c.id],quantity=state.holdings[c.id],invested=state.investedPrincipal[c.id];
    return {...c,price,previousPrice,quantity,changePercent:(price-previousPrice)/previousPrice*100,investedAmount:invested,currentAmount:price*quantity,value:price*quantity,...state.performance[c.id]};
  });
}
export function buyStock(state,id,money) {
  if (isTransactionLocked()) return null;
  if(!company(id))return null;
  const price=state.prices[id];if(!Number.isFinite(money)||money<price)return null;
  state.holdings[id]++;state.investedPrincipal[id]+=price;return price;
}
export function sellStock(state,id) {
  if (isTransactionLocked()) return null;
  if(!company(id)||state.holdings[id]<=0)return null;
  const quantity=state.holdings[id],cost=state.investedPrincipal[id]/quantity;
  state.holdings[id]--;state.investedPrincipal[id]=Math.max(0,state.investedPrincipal[id]-cost);
  return state.prices[id];
}
