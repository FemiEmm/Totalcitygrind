import './production.js';
import { gameState } from './game.js';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {read,transaction,withStoreRequest,initializeStore,closeStore,storageDriver} from './store.js';
import {ApiError,signup,login,refresh,authenticate,logout,publicUser,displayName} from './auth.js';
import {listMessages,createMessage,listTransfers,createTransfer,claimTransfers,listPlaceAds,hasPlaceAdBooking,createPlaceAd} from './socialStore.js';
import {BILLBOARD_IDS,PLACE_AD_PRICE,realWorldAdDate,validateBookingDate,validateImagePath} from './placeAds.js';
import {antiCheatStatus,checkReportedBalance,assertTransactionsAllowed} from './antiCheat.js';
const anon=process.env.ANON_KEY,service=process.env.SERVICE_ROLE_KEY;
if(!anon||!service||anon===service) throw new Error('Distinct ANON_KEY and SERVICE_ROLE_KEY are required');
const origins=(process.env.CLIENT_ORIGINS||'http://localhost:5173').split(',').map(s=>s.trim());
const rate=new Map();
setInterval(()=>{const now=Date.now();for(const [key,bucket] of rate) if(bucket.until<now) rate.delete(key);},60_000).unref();
function limit(ip) {
  const now=Date.now();let bucket=rate.get(ip);
  if(!bucket||bucket.until<now) { if(rate.size>1000) throw new ApiError(429,'Too many clients'); bucket={count:0,until:now+60_000};rate.set(ip,bucket); }
  if(++bucket.count>60) throw new ApiError(429,'Too many authentication requests');
}
async function body(req, maximum = 32768) {
  if(req.tcgBody!==undefined){if(req.tcgBodyBytes>maximum)throw new ApiError(413,'Request too large');return req.tcgBody;}
  let length=0;const parts=[];
  for await(const chunk of req) {length+=chunk.length;if(length>maximum) throw new ApiError(413,'Request too large');parts.push(chunk);}
  try {const parsed=JSON.parse(Buffer.concat(parts).toString()||'{}');if(!parsed||Array.isArray(parsed)||typeof parsed!=='object') throw Error();req.tcgBody=parsed;req.tcgBodyBytes=length;return parsed;}
  catch {throw new ApiError(400,'Expected a JSON object');}
}
function send(_res,status,data) {return {status,data};}
function profilePatch(input) {
  if(Object.keys(input).some(key=>key!=='display_name'))throw new ApiError(400,'Balances, inventory and progression can only change through game actions.');
  return 'display_name' in input?{display_name:displayName(input.display_name)}:{};
}
async function handleRequest(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const origin=req.headers.origin;
    if(origin&&!origins.includes(origin)) throw new ApiError(403,'Origin not allowed');
    if(origin) {res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    res.setHeader('Access-Control-Allow-Headers','authorization, apikey, content-type, prefer, x-client-info, x-supabase-api-version');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, OPTIONS');
    if(req.method==='OPTIONS') return send(res,204);
    const url=new URL(req.url,'http://backender.local');
    if(url.pathname==='/health'&&req.method==='GET'){await initializeStore();return send(res,200,{name:'Backender',status:'ok',version:'0.1.0',storage:storageDriver});}
    if(url.pathname==='/public/stats' && ['GET','POST'].includes(req.method)) {
      if(req.method==='POST') {
        limit(req.socket.remoteAddress||'local');
        const input=await body(req);
        if(typeof input.visitId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(input.visitId)) throw new ApiError(400,'Invalid visit');
        transaction(db=>{
          db.siteStats ||= {visits:0,recent:{}};
          const stats=db.siteStats,now=Date.now();
          for(const [id,time] of Object.entries(stats.recent)) if(now-time>86400000) delete stats.recent[id];
          if(!stats.recent[input.visitId]){stats.visits++;stats.recent[input.visitId]=now;}
        });
      }
      return send(res,200,{visits:read('siteStats')?.visits||0,users:Object.keys(read('users')||{}).length});
    }
    if(url.pathname==='/public/clock' && req.method==='GET') return send(res,200,{serverNow:Date.now()});
    const key=req.headers.apikey;
    if(key!==anon&&key!==service) throw new ApiError(401,'Valid apikey header required');
    const token=req.headers.authorization?.replace(/^Bearer /i,'');
    if(url.pathname.startsWith('/auth/') && req.method==='POST') limit(req.socket.remoteAddress||'local');
    if(url.pathname==='/auth/v1/signup'&&req.method==='POST') return send(res,200,await signup(await body(req)));
    if(url.pathname==='/auth/v1/token'&&req.method==='POST') {
      const input=await body(req),grant=url.searchParams.get('grant_type');
      if(grant==='password') return send(res,200,await login(input));
      if(grant==='refresh_token') return send(res,200,refresh(input));
      throw new ApiError(400,'Unsupported grant type');
    }
    if(url.pathname==='/auth/v1/user'&&req.method==='GET') return send(res,200,publicUser(authenticate(token)));
    if(url.pathname==='/auth/v1/logout'&&req.method==='POST') {logout(token,url.searchParams.get('scope')||'global');return send(res,204);}
    if(url.pathname==='/api/anti-cheat/status' && req.method==='GET') {
      const user=authenticate(token);
      return send(res,200,await antiCheatStatus(user.id));
    }
    if(url.pathname==='/api/anti-cheat/check-balance' && req.method==='POST') {
      const user=authenticate(token);
      const input=await body(req);
      return send(res,200,await checkReportedBalance(user.id,input.currentBalance,'frontend'));
    }
    if(url.pathname==='/public/place-ads' && req.method==='GET') {
      const date=String(url.searchParams.get('date')||realWorldAdDate());
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new ApiError(400,'Invalid ad date');
      const ads=await listPlaceAds(date);
      return send(res,200,{date,ads,slotMinutes:30,timeZone:'Africa/Lagos'});
    }
    if(url.pathname==='/api/messages' && ['GET','POST'].includes(req.method)) {
      const user=authenticate(token);
      if(req.method==='GET') return send(res,200,{messages:await listMessages(user.id)});
      const input=await body(req);
      const recipientUsername=String(input.recipientUsername||'').trim().replace(/^@/,'');
      const text=String(input.text||'').trim();
      if(!/^[a-zA-Z0-9_]{3,24}$/.test(recipientUsername))throw new ApiError(400,'Enter a valid username');
      if(!text||text.length>500)throw new ApiError(400,'Messages must be 1–500 characters');
      const users=read('users');
      const recipient=Object.values(users).find(row=>(row.username||'').toLowerCase()===recipientUsername.toLowerCase());
      if(!recipient)throw new ApiError(404,'Username not found','username_not_found');
      if(recipient.id===user.id)throw new ApiError(400,'Choose another player');
      const message=await createMessage({id:randomUUID(),senderId:user.id,senderUsername:user.username,recipientId:recipient.id,recipientUsername:recipient.username,text,createdAt:Date.now()});
      return send(res,201,{message});
    }
    if(url.pathname==='/api/transfers' && ['GET','POST'].includes(req.method)) {
      const user=authenticate(token);
      if(req.method==='GET') return send(res,200,{transfers:await listTransfers(user.id)});
      await assertTransactionsAllowed(user.id);
      const input=await body(req);
      const recipientUsername=String(input.recipientUsername||'').trim().replace(/^@/,'');
      const amount=Math.round(Number(input.amount)||0);
      const availableBalance=Math.round(Number(input.availableBalance)||0);
      if(!/^[a-zA-Z0-9_]{3,24}$/.test(recipientUsername))throw new ApiError(400,'Enter a valid username');
      if(!Number.isSafeInteger(amount)||amount<=0||amount>1e12)throw new ApiError(400,'Enter a valid transfer amount');
      if(!Number.isSafeInteger(availableBalance)||availableBalance<amount)throw new ApiError(400,'Insufficient funds');
      const users=read('users');
      const recipient=Object.values(users).find(row=>(row.username||'').toLowerCase()===recipientUsername.toLowerCase());
      if(!recipient)throw new ApiError(404,'Username not found','username_not_found');
      if(recipient.id===user.id)throw new ApiError(400,'Choose another player');
      const transfer=await createTransfer({id:randomUUID(),senderId:user.id,senderUsername:user.username,recipientId:recipient.id,recipientUsername:recipient.username,amount,createdAt:Date.now(),claimedAt:null});
      return send(res,201,{transfer});
    }
    if(url.pathname==='/api/transfers/claim' && req.method==='POST') {
      const user=authenticate(token);
      await assertTransactionsAllowed(user.id);
      const claimed=await claimTransfers(user.id);
      return send(res,200,{claimed,total:claimed.reduce((sum,row)=>sum+row.amount,0)});
    }
    if(url.pathname==='/api/place-ads' && req.method==='POST') {
      const user=authenticate(token);
      await assertTransactionsAllowed(user.id);
      const input=await body(req);
      const billboardId=String(input.billboardId||'');
      if(!BILLBOARD_IDS.has(billboardId))throw new ApiError(400,'Choose a valid billboard');
      const bookingDate=validateBookingDate(input.bookingDate);
      const availableBalance=Math.round(Number(input.availableBalance)||0);
      if(!Number.isSafeInteger(availableBalance)||availableBalance<PLACE_AD_PRICE)throw new ApiError(400,'You need ₦10,000 to place this ad');
      if(await hasPlaceAdBooking(user.id,billboardId,bookingDate))throw new ApiError(409,'You already booked this billboard for this date','duplicate_booking');
      const imagePath=validateImagePath(input.imagePath,{playerId:user.id,billboardId,bookingDate});
      try {
        const booking=await createPlaceAd({id:randomUUID(),billboardId,playerId:user.id,username:user.username,bookingDate,imagePath,amountPaid:PLACE_AD_PRICE,createdAt:Date.now()});
        const ads=await listPlaceAds(bookingDate);
        const sameBillboard=ads.filter(row=>row.billboardId===billboardId);
        const position=Math.max(0,sameBillboard.findIndex(row=>row.id===booking.id));
        return send(res,201,{booking,price:PLACE_AD_PRICE,totalBookings:sameBillboard.length,position,slotMinutes:30,timeZone:'Africa/Lagos'});
      } catch(error) {
        if(error?.code==='23505'||error?.code==='PLACE_AD_DUPLICATE')throw new ApiError(409,'You already booked this billboard for this date','duplicate_booking');
        if(error?.status===400)throw new ApiError(400,error.message);
        throw error;
      }
    }
    if(url.pathname==='/api/game' && req.method==='POST') {
      const user=authenticate(token);
      const input=await body(req,2*1024*1024);
      const allowed=['bootstrap','claim','save','rankings','delete-account','housing'].includes(input.action)
        || (input.action==='economy' && ['day-close','session-checkpoint'].includes(input.op))
        || (input.action==='government' && ['status','vote'].includes(input.op||'status'))
        || (['club','career'].includes(input.action) && (input.op||'status')==='status');
      if(!allowed || (input.action==='housing' && input.op==='sleep')) throw new ApiError(403,'This action requires live-world validation');
      if(['economy','housing','career','government','club','heist'].includes(input.action)) await assertTransactionsAllowed(user.id);
      return send(res,200,gameState({...input,playerId:user.id,serverPose:null,serverTarget:null,serverTruckBayBlocked:true}));
    }
    if(url.pathname==='/rest/v1/rpc/game_state' && req.method==='POST') {
      if(key!==service || token!==service) throw new ApiError(403,'Game server access required');
      const gameInput=await body(req, 2 * 1024 * 1024);
      if(['economy','housing','career','government','club','heist'].includes(gameInput.action)) await assertTransactionsAllowed(gameInput.playerId);
      return send(res,200,gameState(gameInput));
    }
    if(url.pathname==='/rest/v1/profiles') {
      for(const key of url.searchParams.keys()) if(!['id','select'].includes(key)) throw new ApiError(400,'Unsupported query parameter');
      if(url.searchParams.has('select')&&url.searchParams.get('select')!=='*') throw new ApiError(400,'Only select=* is supported');
      const filter=url.searchParams.get('id');
      if(!filter||!/^eq\.[a-f0-9-]{36}$/.test(filter)) throw new ApiError(400,'Provide id=eq.<user UUID>');
      const id=filter.slice(3);
      const privileged=key===service&&token===service;
      if(!privileged&&authenticate(token).id!==id) throw new ApiError(403,'You can only access your own profile');
      if(req.method==='GET') {const profile=read('profiles',id);return send(res,200,profile?[profile]:[]);}
      if(req.method==='PATCH') {
        if(!privileged) throw new ApiError(403,'Only the game server may update profiles');
        const patch=profilePatch(await body(req));
        const updated=transaction(db=>{if(!db.profiles[id]) return null;Object.assign(db.profiles[id],patch,{updated_at:new Date().toISOString()});return db.profiles[id];});
        if(req.headers.prefer?.includes('return=representation')) return send(res,200,updated?[updated]:[]);
        return send(res,204);
      }
    }
    throw new ApiError(404,'Endpoint not implemented by Backender');
  } catch(error) { throw error; }
}
const server=createServer(async(req,res)=>{
  try{
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
    const origin=req.headers.origin;
    if(origin&&!origins.includes(origin))throw new ApiError(403,'Origin not allowed');
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    if(['POST','PATCH'].includes(req.method)){const max=['/rest/v1/rpc/game_state','/api/game'].includes(req.url)?2*1024*1024:32768;await body(req,max);}
    // Health and preflight do not acquire the game-state lock.
    const bypass=req.method==='OPTIONS'||(req.method==='GET'&&(req.url==='/health'||req.url==='/public/clock'||req.url?.startsWith('/public/place-ads')));
    const result=await (bypass?handleRequest(req,res):withStoreRequest(()=>handleRequest(req,res)));
    res.writeHead(result.status);res.end(result.status===204?undefined:JSON.stringify(result.data));
  }catch(error){
    if(error?.code==='23505')error=new ApiError(409,'This action or reservation already exists. Refresh your account before trying again.','conflict');
    if(!(error instanceof ApiError))console.error('Backender request failed:',error.code||error.name);
    const message=error instanceof ApiError?error.message:'Game service unavailable. Please try again shortly.';
    if(!res.headersSent){res.writeHead(error instanceof ApiError?error.status:503);res.end(JSON.stringify({code:error instanceof ApiError?error.code:'service_unavailable',message,msg:message}));}
    else res.end();
  }
});
server.requestTimeout=10_000;server.headersTimeout=10_000;
const host=process.env.HOST||(process.env.RENDER?'0.0.0.0':'127.0.0.1'),port=Number(process.env.PORT||3001);
if(!Number.isInteger(port)||port<1||port>65535) throw new Error('Invalid PORT');
server.on('error',error=>{console.error('Backender could not listen:',error.message);process.exit(1);});
try { await initializeStore(); } catch(error) { console.error('Database startup failed. Check DATABASE_URL, the SSL certificate and the Supabase migration. Code:',error.code||error.name);await closeStore();process.exit(1); }
server.listen(port,host,()=>console.log('Backender: http://'+host+':'+port+' ('+storageDriver+' storage)'));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{server.close(()=>{closeStore().finally(()=>process.exit(0));});setTimeout(()=>process.exit(1),5000).unref();});
