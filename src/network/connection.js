import { shallowReactive } from 'vue';
import { io } from 'socket.io-client';
import { publicPlaceAdImageUrl } from '../advertising/placeAdStorage.js';
import { setTransactionLock } from '../security/transactionLock.js';

const backend = (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const server = (import.meta.env.VITE_GAME_SERVER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const anon = import.meta.env.VITE_BACKEND_ANON_KEY || '';
const sessionKey = 'tcg-account-session-v1';
let session = null;
try { session = JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { /* Sign in again. */ }
export const connection = shallowReactive({
  user: session?.user || null, backend: 'Not checked', server: 'Not checked',
  presence: 'Offline', players: [], playerId: null, capacity: 100,
  wallet: null, save: 'Not connected', lastSaved: null, error: '', revision: 0, home: null, homesAvailable: null,
  antiCheatStatus: 'active', transactionsLocked: false, antiCheatReason: null, antiCheatFlaggedAt: null,
});
let refreshPromise = null;
let socket = null;
let poseSource = null;
let moveTimer = null;
let joinedVehicle = null;
let joining = false;
let sequence = 0;

async function request(url, options = {}) {
  const { timeoutMs = 10000, authRetried = false, ...fetchOptions } = options;
  const response = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(timeoutMs) });
  const body = response.status === 204 ? null : await response.json();
  if(response.status===401 && !authRetried && session && fetchOptions.headers?.Authorization){
    const token=await accessToken(true);
    return request(url,{...options,authRetried:true,headers:{...fetchOptions.headers,Authorization:'Bearer '+token}});
  }
  if (!response.ok) {
    if (response.status === 423) {
      connection.antiCheatStatus = 'review';
      connection.transactionsLocked = true;
      connection.antiCheatReason = body?.code || 'transactions_under_review';
      setTransactionLock(true);
    }
    const error = new Error(body?.message || body?.msg || `Request failed (${response.status})`); error.status = response.status; error.code = body?.code; throw error;
  }
  return body;
}
function storeSession(value) {
  const rotated = session?.access_token && value?.access_token && session.access_token !== value.access_token;
  if(session?.user?.id!==value?.user?.id)connection.wallet=null;
  session = value; connection.user = value?.user || null;
  if (rotated && socket) socket.disconnect().connect();
  if (value) localStorage.setItem(sessionKey, JSON.stringify(value)); else localStorage.removeItem(sessionKey);
}
export async function signIn({ email, password, name, username, identifier, accepted, signup }) {
  if (!anon) throw new Error('Set VITE_BACKEND_ANON_KEY in .env.local, then restart Vite.');
  const value = await request(backend + (signup ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password'), {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify(signup ? { email, password, data: { username, full_name: name, age_confirmed: accepted, terms_accepted: accepted, terms_version: '2026-10-05' } } : { identifier: identifier || email, email: identifier || email, password }),
  });
  storeSession(value); connection.error = ''; connection.backend = 'Connected';
}
async function accessToken(forceRefresh=false) {
  if (!session) throw new Error('Sign in first.');
  if (!forceRefresh && session.expires_at * 1000 > Date.now() + 120000) return session.access_token;
  if (!refreshPromise) refreshPromise = request(backend + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  }).then(value => { storeSession(value); return value.access_token; }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}
async function authenticatedBackendRequest(path, options = {}) {
  const headers = {
    apikey: anon,
    ...(options.headers || {}),
    Authorization: 'Bearer ' + await accessToken(),
  };
  return request(backend + path, { ...options, headers });
}

export async function refreshAntiCheatStatus() {
  if (!connection.user?.id) return { transactionStatus: 'active', transactionsLocked: false };
  const result = await authenticatedBackendRequest('/api/anti-cheat/status');
  connection.antiCheatStatus = result?.transactionStatus || 'active';
  connection.transactionsLocked = result?.transactionsLocked === true;
  setTransactionLock(connection.transactionsLocked);
  connection.antiCheatReason = result?.reason || null;
  connection.antiCheatFlaggedAt = result?.flaggedAt || null;
  return result;
}

let antiCheatCheckPromise = null;
let antiCheatLastReportedBalance = null;
export async function reportBalanceForAntiCheat(currentBalance) {
  if (!connection.user?.id || connection.transactionsLocked) return null;
  const balance = Math.round(Number(currentBalance));
  if (!Number.isSafeInteger(balance) || balance <= 100_000_000) return null;
  if (antiCheatLastReportedBalance !== null && Math.abs(balance - antiCheatLastReportedBalance) < 1_000_000) return null;
  antiCheatLastReportedBalance = balance;
  if (antiCheatCheckPromise) return antiCheatCheckPromise;
  antiCheatCheckPromise = authenticatedBackendRequest('/api/anti-cheat/check-balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentBalance: balance }),
  }).then((result) => {
    connection.antiCheatStatus = result?.transactionStatus || 'active';
    connection.transactionsLocked = result?.transactionsLocked === true;
  setTransactionLock(connection.transactionsLocked);
    connection.antiCheatReason = result?.reason || null;
    connection.antiCheatFlaggedAt = result?.flaggedAt || null;
    if (connection.transactionsLocked) connection.error = 'Transactions are temporarily unavailable while account activity is reviewed.';
    return result;
  }).finally(() => { antiCheatCheckPromise = null; });
  return antiCheatCheckPromise;
}

export function assertClientTransactionsAllowed() {
  if (connection.transactionsLocked) throw new Error('Transactions are temporarily unavailable while account activity is reviewed.');
}

setInterval(() => {
  if (connection.user?.id && connection.transactionsLocked) void refreshAntiCheatStatus().catch(() => {});
}, 60_000);

export async function getPlayerMessages() {
  return authenticatedBackendRequest('/api/messages');
}

export async function sendPlayerMessage(recipientUsername, text) {
  return authenticatedBackendRequest('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientUsername, text }),
  });
}

export async function getPlayerTransfers() {
  return authenticatedBackendRequest('/api/transfers');
}

export async function sendPlayerTransfer(recipientUsername, amount, availableBalance) {
  assertClientTransactionsAllowed();
  return authenticatedBackendRequest('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientUsername, amount, availableBalance }),
  });
}

export async function claimPlayerTransfers() {
  assertClientTransactionsAllowed();
  return authenticatedBackendRequest('/api/transfers/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}


export async function getPlaceAds(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const result = await request(backend + '/public/place-ads' + query, {headers:{apikey:anon}});
  if (Array.isArray(result?.ads)) {
    result.ads = result.ads.map((ad) => ({ ...ad, imageUrl: publicPlaceAdImageUrl(ad.imagePath) }));
  }
  return result;
}

export async function bookPlaceAd({ billboardId, bookingDate, imagePath, availableBalance }) {
  assertClientTransactionsAllowed();
  return authenticatedBackendRequest('/api/place-ads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ billboardId, bookingDate, imagePath, availableBalance }),
  });
}

export async function signOut() {
  disconnectWorld();
  try { if (session) await request(backend + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: anon, Authorization: 'Bearer ' + await accessToken() } }); }
  finally { storeSession(null); connection.save = 'Not connected'; connection.revision = 0; connection.home = null; connection.homesAvailable = null; connection.lastSaved = null; connection.antiCheatStatus='active'; connection.transactionsLocked=false; setTransactionLock(false); connection.antiCheatReason=null; connection.antiCheatFlaggedAt=null; antiCheatLastReportedBalance=null; }
}
export async function deleteOnlineAccount(confirmation) {
  const id = connection.user?.id;
  if (!id) throw new Error('Sign in first.');
  await gameRequest('delete-account', { confirmation });
  disconnectWorld();
  storeSession(null);
  // Remove only this account's cached slots; offline saves belong to the player separately.
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('total-city-grind-') && key.includes('-account-' + id + '-slot-')) localStorage.removeItem(key);
    }
  } catch { /* The cloud deletion has succeeded even if browser storage is unavailable. */ }
  Object.assign(connection, { save: 'Account deleted', revision: 0, home: null, homesAvailable: null, lastSaved: null, error: '' });
}
export async function checkConnections() {
  await Promise.allSettled([
    request(backend + '/health').then(() => { connection.backend = 'Connected'; }).catch(() => { connection.backend = 'Unavailable'; }),
    request(server + '/health').then(() => { connection.server = 'Connected'; }).catch(() => { connection.server = 'Unavailable'; }),
  ]);
}
let gameQueue=Promise.resolve();
function usesDirectBackend(action,payload={}) {
 return ['bootstrap','claim','save','rankings','delete-account','housing'].includes(action)
  || (action==='economy' && ['day-close','session-checkpoint'].includes(payload.op))
  || (action==='government' && ['status','vote'].includes(payload.op||'status'))
  || (['club','career'].includes(action) && (payload.op||'status')==='status');
}
export function gameRequest(action,payload={}) {
 const accountId=connection.user?.id;
 const input={requestTime:Date.now(),...payload,requestId:payload.requestId||globalThis.crypto?.randomUUID?.()||('request-'+Date.now()+'-'+Math.random().toString(36).slice(2))};
 const request=gameQueue.then(()=>{if(accountId!==connection.user?.id)throw Error('Account changed. Please try again.');return executeGameRequest(action,input);});gameQueue=request.catch(()=>{});return request;
}
async function executeGameRequest(action, payload = {}) {
  const accountId=connection.user?.id;
  if(action==='save')payload={...payload,revision:connection.revision};
  try {
    const direct=usesDirectBackend(action,payload);
    const result = await request((direct?backend:server) + '/api/game', { method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json', Authorization: 'Bearer ' + await accessToken() },
      body: JSON.stringify({ action, ...payload }),
    });
    if(accountId!==connection.user?.id)throw Error('Account changed while request was running.');
    if(action==='save'&&Number.isInteger(result.revision))connection.revision=result.revision;
    if(result.wallet&&(!connection.wallet||result.wallet.version>=connection.wallet.version))connection.wallet=result.wallet;
    if(!direct)connection.server = 'Connected'; connection.backend = 'Connected'; return result;
  } catch (error) { connection.error = error.message; throw error; }
}

export function emergencyGameRequest(action, payload = {}) {
  const token = session?.access_token;
  if (!token || !connection.user?.id) return false;
  const input = {
    requestTime: Date.now(),
    ...payload,
    requestId: payload.requestId || globalThis.crypto?.randomUUID?.() || ('request-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
  };
  try {
    void fetch((usesDirectBackend(action,payload)?backend:server) + '/api/game', {
      method: 'POST',
      keepalive: true,
      headers: { apikey: anon, 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action, ...input }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function bootstrapAccount() {
  const data = await gameRequest('bootstrap');
  connection.home = data.home; connection.homesAvailable = data.homes.filter(home => home.available).length;
  connection.revision = data.save?.revision || 0;
  connection.lastSaved = data.save?.updatedAt || null;
  connection.save = data.save ? 'Saved on Backender' : 'Choose a home';
  connection.error = '';
  try { await refreshAntiCheatStatus(); } catch { /* Gameplay can continue if the review-status check is temporarily unavailable. */ }
  return data;
}
export async function uploadSave(snapshot) {
  connection.save = 'Saving…';
  try {
    const result = await gameRequest('save', { snapshot, revision: connection.revision });
    connection.revision = result.revision; connection.lastSaved = result.updatedAt;
    connection.save = 'Saved on Backender'; connection.error = '';
  } catch (error) { connection.save = 'Local save only — sync failed'; throw error; }
}
export function retryWorldConnection() { connection.error = ''; socket?.connect(); }
export function disconnectWorld() {
  clearInterval(moveTimer); moveTimer = null; poseSource = null;
  socket?.disconnect(); socket = null;
  connection.players = []; connection.playerId = null; connection.presence = 'Offline';
  joinedVehicle = null; joining = false;
}
export function connectWorld(getPose, beforeJoin = async () => {}) {
  disconnectWorld(); poseSource = getPose;
  connection.presence = 'Connecting…';
  const client = io(server, { autoConnect: false, auth: async callback => {
    try { callback({ token: await accessToken() }); } catch (error) { connection.error = error.message; callback({}); }
  }, reconnectionDelay: 1000, reconnectionDelayMax: 10000 });
  socket = client;
  const snapshot = data => {
    if (socket !== client) return;
    connection.players = data.players.filter(p => p.id !== connection.playerId);
  };
  client.on('world:snapshot', snapshot);
  client.on('connect_error', error => { connection.presence = 'Connection failed'; connection.error = error.message; });
  client.on('disconnect', reason => {
    if(reason==='io server disconnect')setTimeout(async()=>{
      if(socket!==client||!session)return;
      try { await accessToken(); if(socket===client)client.connect(); } catch(error){connection.error=error.message;}
    },2000); connection.presence = 'Disconnected'; connection.players = []; joinedVehicle = null; joining = false; });
  client.on('server:error', error => { connection.error = error.message; });
  client.on('server:shutdown', () => { connection.presence = 'Server stopped'; });
  client.on('player:left', ({ playerId }) => { connection.players = connection.players.filter(p => p.id !== playerId); });
  client.on('connect', () => { connection.presence = 'Joining city…'; joinedVehicle = null; sequence = 0; });
  client.connect();
  moveTimer = setInterval(async () => {
    if (socket !== client || !client.connected || joining) return;
    let pose = poseSource?.(); if (!pose) return;
    if (joinedVehicle !== pose.vehicleId) {
      joining = true;
      try {
        await beforeJoin();
        if (socket !== client || !client.connected) return;
        pose = poseSource?.(); if (!pose) return;
        if (joinedVehicle) await client.timeout(5000).emitWithAck('world:leave');
        const result = await client.timeout(5000).emitWithAck('world:join', {
          protocolVersion: 1, worldId: 'lagos-mainland-01', name: connection.user?.user_metadata?.display_name || 'Driver',
          vehicleId: pose.vehicleId, pose,
        });
        if (socket !== client) return;
        if (!result.ok) { connection.error = result.error.message; client.disconnect(); return; }
        joinedVehicle = pose.vehicleId; sequence = 0; connection.playerId = result.data.playerId;
        connection.capacity = result.data.maxPlayers; connection.presence = 'In city'; snapshot(result.data);
      } catch (error) { connection.error = error.message; client.disconnect(); }
      finally { joining = false; }
      return;
    }
    client.volatile.emit('player:move', { x: pose.x, y: pose.y, rotation: pose.rotation, speed: document.hidden ? 0 : pose.speed, sequence: sequence++ });
  }, 100);
}

// One visit per page load; retries reuse its ID and do not count twice.
const menuVisitId=crypto.randomUUID();
let menuVisitRecorded=false;
export async function getMenuStatistics() {
  const [population,totals]=await Promise.allSettled([
    request(server+'/health'),
    request(backend+'/public/stats',menuVisitRecorded?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitId:menuVisitId})}),
  ]);
  if(totals.status==='fulfilled')menuVisitRecorded=true;
  return {online:population.status==='fulfilled'?population.value.players:null,visits:totals.status==='fulfilled'?totals.value.visits:null,users:totals.status==='fulfilled'?totals.value.users:null};
}
