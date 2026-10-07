import {requestIdentity} from './economy/requests.js';
import {account,settle,minuteOf,dayOf,walletView,protectSnapshot,progress,audit} from './economy/authority.js';
import {economyAction,observeEconomyLocation} from './economy/actions.js';
import { heistRequest } from './heist/api.js';
import { housingRequest } from './housing/api.js';
import { updateWorldWaste } from './careers/wasteWorld.js';
import { clubRequest } from './club/api.js';
import { governmentRequest, governmentDb, acknowledgeGovernment } from './government/api.js';
import { adjustedRent } from './government/rules.js';
import { careerRequest } from './careers/api.js';
import { readFileSync } from 'node:fs';
import { read, transaction } from './store.js';
import { ApiError } from './auth.js';
import { calculateNetWorth, rankWealth } from './wealth/netWorth.js';
const wealthCatalogue = JSON.parse(readFileSync(new URL('./wealth/catalogue.json', import.meta.url), 'utf8'));
const homes = JSON.parse(readFileSync(new URL('../data-catalog/homes.json', import.meta.url), 'utf8'));
const homeParking=JSON.parse(readFileSync(new URL('../data-catalog/housing-parking.json',import.meta.url),'utf8'));
const catalogue = new Map(homes.map(home => [home.id, home]));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function persistGameSnapshot(db,playerId,snapshot,expectedRevision){
  const home = Object.values(db.homes || {}).find(h => h.playerId === playerId);
  if (!home) throw new ApiError(409, 'Choose your home first');
  const state = snapshot?.currentMapId === 'coastal-city' ? snapshot.world2State : snapshot;
  if (!object(snapshot) || snapshot.version !== 1 || !object(state) || state.propertyState?.starterHomeId !== home.homeId ||
    !object(state.economyState) || !Number.isFinite(state.economyState.money) || Math.abs(state.economyState.money) > 1e12 ||
    !Array.isArray(state.economyState.ownedVehicleIds) || state.economyState.ownedVehicleIds.length > 100 ||
    state.economyState.ownedVehicleIds.some(id => typeof id !== 'string' || id.length > 64)) throw new ApiError(400, 'Invalid game snapshot');
  db.gameStates ||= {};
  const revision = db.gameStates[playerId]?.revision || 0;
  if (expectedRevision !== revision) throw new ApiError(409, 'A newer account save exists. Reopen Online and continue from the server.');
  const updatedAt = new Date().toISOString();
  const saved = { revision: revision + 1, updatedAt, snapshot };
  db.gameStates[playerId] = saved;
  db.profiles[playerId].progression ||= {};
  db.profiles[playerId].progression.firstGameSavedAt ||= updatedAt;
  acknowledgeGovernment(db,playerId,state.governmentLocal?.lastReceipt);
  const heist=db.heists?.accounts[playerId];
  if(heist)heist.receipts=heist.receipts.filter(r=>r.id>(Number(state.heistLocal?.lastReceipt)||0));
  const housing=db.housing?.accounts[playerId];
  if(housing)housing.receipts=housing.receipts.filter(r=>r.id>(Number(state.housingLocal?.lastReceipt)||0));
  const clubAccount=db.club?.accounts[playerId];if(clubAccount)clubAccount.receipts=clubAccount.receipts.filter(r=>r.id>(Number(state.clubLocal?.lastReceipt)||0));
  const career=db.careers?.[playerId];
  const credited=Number(state.careerLocal?.lastReceipt)||0;
  if(career && credited>0)career.receipts=career.receipts.filter(r=>r.id>credited);
  if (state.crimeState?.status === 'free') {
    for (const [id, bay] of Object.entries(db.policeBays || {})) if (bay.playerId === playerId) delete db.policeBays[id];
  }
  Object.assign(db.profiles[playerId], { money: Math.round(state.economyState.money), bpcWealth: calculateNetWorth(state, wealthCatalogue),
    owned_vehicle_ids: [...new Set(['starter-danfo', ...state.economyState.ownedVehicleIds])],
    inventory: state.playerInventory || {}, customization: state.customizationState || {},
    progression: { ...db.profiles[playerId].progression, day: state.gameClock?.day || 1, selectedJob: state.employmentState?.selectedJob || null }, updated_at: updatedAt });
  return { revision: saved.revision, updatedAt };
}
// All calls arrive through the authenticated game server with its private service key.
function dispatchGameState(input) {
  const { action, playerId } = input;
  if (typeof playerId !== 'string' || !read('profiles',playerId)) throw new ApiError(404, 'Player not found');
  if (action === 'economy') return transaction(db=>economyAction(db,input));
  if (action === 'passengers') throw new ApiError(410, 'Refresh the game to use local passenger boarding.');
  if (action === 'heist') return heistRequest(input);
  if (action === 'housing') return housingRequest(input);
  if (action === 'club') return clubRequest(input);
  if (action === 'government') return governmentRequest(input);
  if (action === 'career') return careerRequest(input);
  if (action === 'delete-account') {
    if (input.confirmation !== 'DELETE') throw new ApiError(400, 'Type DELETE to confirm account deletion');
    return transaction(db => {
      updateWorldWaste(db);
      if(db.careers) delete db.careers[playerId];
      updateWorldWaste(db);
      if(db.careerNotices) delete db.careerNotices[playerId];
      const g=governmentDb(db);g.candidates=g.candidates.filter(c=>c.id!==playerId);delete g.votes[playerId];for(const [v,c] of Object.entries(g.votes))if(c===playerId)delete g.votes[v];delete g.accounts[playerId];g.arrears=g.arrears.filter(c=>c.playerId!==playerId);if(g.governor.id===playerId)g.governor={id:null,name:'DIDEJADE OWOWOLU'};
      if(db.club){delete db.club.accounts[playerId];db.club.events=db.club.events.filter(e=>!e.id.startsWith(playerId+':'));}
      if(db.housing){
        for(const [homeId,row] of Object.entries(db.housing.homes)){
          if(row.ownerId===playerId){if(row.tenantId&&db.housing.accounts[row.tenantId])db.housing.accounts[row.tenantId].activeHomeId='starter-rental';delete db.housing.homes[homeId];}
          else if(row.occupantId===playerId){row.occupantId=null;row.tenantId=null;}
        }
        delete db.housing.accounts[playerId];
      }
      if(db.heists){delete db.heists.accounts[playerId];if(db.heists.holder===playerId){db.heists.holder=null;db.heists.cooldownUntil=(Date.now()-db.heists.epoch)/1000+2880;}}
      if(db.passengers){
        const minute=(Date.now()-db.passengerEpoch)/1000,session=db.passengers.sessions[playerId];
        for(const npc of db.passengers.npcs)if(npc.vehicle===playerId){npc.vehicle=null;npc.stop=session?.lastStop||npc.stop;npc.destination=null;npc.readyAt=minute+120;npc.fare=0;}
        delete db.passengers.sessions[playerId];
      }
      if(Array.isArray(db.directMessages))db.directMessages=db.directMessages.filter(row=>row.senderId!==playerId&&row.recipientId!==playerId);
      if(Array.isArray(db.playerTransfers))db.playerTransfers=db.playerTransfers.filter(row=>row.senderId!==playerId&&row.recipientId!==playerId);
      delete db.users[playerId];
      delete db.profiles[playerId];
      if (db.gameStates) delete db.gameStates[playerId];
      if(db.wallets)delete db.wallets[playerId];
      if(db.antiCheat)delete db.antiCheat[playerId];
      for (const [key, session] of Object.entries(db.sessions)) if (session.userId === playerId) delete db.sessions[key];
      for (const section of ['homes', 'policeBays']) {
        for (const [key, row] of Object.entries(db[section] || {})) if (row.playerId === playerId) delete db[section][key];
      }
      return { deleted: true };
    });
  }
  if (action === 'police-bay') return transaction(db => {
    db.policeBays ||= {};
    const existing = Object.values(db.policeBays).find(bay => bay.playerId === playerId);
    if (existing) return existing;
    const allowed = Array.from({ length:6 }, (_,i) => 'nightlife-police-bay-' + (i+1));
    const bayId = allowed.find(id => !db.policeBays[id] && Array.isArray(input.availableBayIds) && input.availableBayIds.includes(id));
    if (!bayId) throw new ApiError(409, 'All police parking bays are occupied. Try again shortly.');
    const reservation = { bayId, playerId }; db.policeBays[bayId] = reservation; return reservation;
  });
  if (action === 'rankings') {
    const rows = Object.values(read('profiles')).map(profile => {
      let wealth = profile.bpcWealth;
      if (!wealth) {
        const snapshot = read('gameStates', profile.id)?.snapshot;
        const state = snapshot?.currentMapId === 'coastal-city' ? snapshot.world2State : snapshot;
        wealth = calculateNetWorth(state || { economyState: { money: profile.money } }, wealthCatalogue);
      }
      // Return public ranking fields only, never email, balances, inventory or save payloads.
      return { id: profile.id, name: profile.display_name, wealth: wealth.total, updatedAt: profile.updated_at, fictional: false };
    });
    return { players: rankWealth(rows), generatedAt: new Date().toISOString() };
  }
  if (action === 'bootstrap') return transaction(db=>{
    const g=governmentDb(db);
    return {profile:db.profiles[playerId],home:Object.values(db.homes||{}).find(h=>h.playerId===playerId)||null,
      save:db.gameStates?.[playerId]||null,
      firstGamePending: !db.gameStates?.[playerId] && db.profiles[playerId].progression?.housingStarted === true && !db.profiles[playerId].progression?.firstGameSavedAt && Object.values(db.homes||{}).some(h=>h.playerId===playerId && h.homeId===db.wallets?.[playerId]?.state?.propertyState?.starterHomeId),
      homes:homes.map(h=>({...h,weeklyRent:adjustedRent(h,g.rentPercent),available:!db.homes?.[h.id]||db.homes[h.id].playerId===playerId}))};
  });
  if (action === 'claim') return transaction(db => {
    db.homes ||= {}; db.gameStates ||= {};
    const owned = Object.values(db.homes).find(h => h.playerId === playerId);
    if (owned) { if (owned.homeId !== input.homeId) throw new ApiError(409, 'This account already has a home. Continue your game.'); return owned; }
    const home = catalogue.get(input.homeId);
    if (!home) throw new ApiError(400, 'Unknown home');
    if (db.homes[home.id]) throw new ApiError(409, 'Someone has rented that home. Choose another room.');
    const profile = db.profiles[playerId];
    // Starting grant is issued once, together with the first tenancy, in one disk transaction.
    if (profile.progression?.housingStarted) throw new ApiError(409, 'Housing already initialized');
    const weeklyRent=adjustedRent(home,governmentDb(db).rentPercent);
    if(weeklyRent>50000)throw new ApiError(400,'Choose a room affordable with the starting grant.');
    profile.money = 50000 - weeklyRent;
    profile.bpcWealth = calculateNetWorth({ economyState: { money: profile.money } }, wealthCatalogue);
    profile.inventory = { items: { bread: 2, 'bottled-water': 1 } };
    profile.progression = { ...profile.progression, housingStarted: true, homeId: home.id };
    profile.updated_at = new Date().toISOString();
    const tenancy = { homeId: home.id, playerId, weeklyRent, firstRentPaid: weeklyRent, startingBalance: profile.money, claimedAt: profile.updated_at };
    db.homes[home.id] = tenancy;
    return tenancy;
  });
  if (action === 'save') return transaction(db => persistGameSnapshot(db,playerId,input.snapshot,input.revision));
  throw new ApiError(400, 'Unknown game action');
}

// All domain changes, wallet debits/credits and save projection share one commit.
export function gameState(input){
 try{return transaction(db=>{
  const id=input.playerId;if(!db.profiles[id])throw new ApiError(404,'Player not found');
  const w=account(db,id);
  // Status/heartbeat operations advance server-owned cursors; every explicit command is receipted.
  const polling=['career','government','club','housing','heist','passengers','economy'].includes(input.action)&&['status','tick','moto-tick'].includes(input.op);
  const mutation=!['bootstrap','rankings'].includes(input.action)&&!polling;
  const identity=mutation?requestIdentity(input):null;
  const requestKey=identity?.key;
  const previous=mutation?w.requests[requestKey]:null;
  if(previous){
   if(previous.fingerprint!==identity.fingerprint)throw new ApiError(409,'This request ID was already used for a different action.');
   return {...structuredClone(previous.result),wallet:walletView(w)};
  }
  if(input.action==='career'&&input.op==='tick'){
   const now=Date.now(),elapsed=(now-(w.lastClockPulse||now))/1000;
   if(input.serverPose&&elapsed>=0&&elapsed<15)w.originMinute+=Math.min(10,elapsed,Math.max(0,Number(input.minutes)||0));
   w.lastClockPulse=now;
  }
  settle(db,id);
  if(!w.housingStarted&&!['bootstrap','rankings','claim','delete-account'].includes(input.action))throw new ApiError(409,'Choose your first home before playing.');
  const trusted={...input,money:w.state.economyState.money,savings:w.state.bankSavingsState.balance,minute:minuteOf(w),day:dayOf(w),gameWeek:Math.floor((dayOf(w)-1)/7),income:w.income,lastReceipt:w.applied[input.action]||0,ack:w.applied.passengers||0};
  if(input.action==='career')trusted.money=w.state.economyState.money;
  if(input.action==='save')trusted.snapshot=protectSnapshot(db,id,input.snapshot);
  if(input.action==='economy'&&['day-close','session-checkpoint'].includes(input.op))trusted.snapshot=input.snapshot;
  const result=dispatchGameState(trusted);
  if(input.action==='economy'&&['day-close','session-checkpoint'].includes(input.op)){
    const saved=persistGameSnapshot(db,id,protectSnapshot(db,id,trusted.snapshot),input.revision);
    Object.assign(result,saved);
  }
  if(trusted.serverPose)observeEconomyLocation(db,id,trusted.serverPose);
  if(input.action==='passengers'&&input.op==='start'){progress(w,'job-selected');progress(w,'route-selected');}
  if(trusted.serverPose&&Math.abs(trusted.serverPose.speed)>0.5)progress(w,'engine-started');
  if(input.action==='housing'&&input.op==='sleep'){
   if(db.careers?.[id]?.shift||db.careers?.[id]?.lesson)throw new ApiError(409,'Finish your shift or class before sleeping.');
   w.originMinute+=Math.min(8,Math.max(1,Number(input.hours)||1))*60;
   progress(w,'home-arrived');progress(w,'slept-at-home');
  }
  const homeId=db.housing?.accounts[id]?.activeHomeId;
  const bay=homeParking[!homeId||homeId==='starter-rental'?db.profiles[id]?.progression?.homeId:homeId],pose=trusted.serverPose;
  if(bay&&pose&&Math.abs(pose.speed)<2&&pose.x>=bay.x&&pose.x<=bay.x+bay.width&&pose.y>=bay.y&&pose.y<=bay.y+bay.height)progress(w,'home-arrived');
  if(input.action==='housing'&&input.op==='buy')progress(w,input.propertyId==='wealthy-estate-home'?'wealthy-home-purchased':'first-home-purchased');
  if(input.action==='delete-account')return result;
  if(input.action==='claim'&&!w.housingStarted){
   w.housingStarted=true;
   w.state.economyState.money=50000;audit(w,50000,'STARTING GRANT',false);
   w.state.economyState.money=result.startingBalance;audit(w,-result.firstRentPaid,'FIRST HOME RENT',false);
   w.state.playerInventory=structuredClone(db.profiles[id].inventory);w.state.propertyState.starterHomeId=result.homeId;w.version++;
  }
  // Day-end economy sync is already the final client checkpoint for the closed
  // day. Do not immediately run next-day financial settlement over it.
  if(!(input.action==='economy'&&['day-close','session-checkpoint'].includes(input.op)))settle(db,id);
  // Project trusted state back into stored saves and bootstrap results.
  if(db.gameStates?.[id])db.gameStates[id].snapshot=protectSnapshot(db,id,db.gameStates[id].snapshot);
  for(const [profileId,wallet] of Object.entries(db.wallets))if(db.profiles[profileId])db.profiles[profileId].bpcWealth=calculateNetWorth(wallet.state,wealthCatalogue);
  if(input.action==='bootstrap'){result.save=db.gameStates?.[id]||null;result.profile=db.profiles[id];}
  if(mutation)w.requests[requestKey]={fingerprint:identity.fingerprint,result:structuredClone(result),at:Date.now()};
  // Keep only the retry window in memory. PostgreSQL retains immutable receipts to reject reused IDs.
  for(const [key,receipt] of Object.entries(w.requests))if(receipt.at&&Date.now()-receipt.at>900000)delete w.requests[key];
  return {...result,wallet:walletView(w)};
 });}catch(e){if(e instanceof ApiError)throw e;throw new ApiError(400,e.message||'Financial action rejected');}
}
