import { shallowReactive } from 'vue';
import { io } from 'socket.io-client';

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
});
let refreshPromise = null;
let socket = null;
let poseSource = null;
let moveTimer = null;
let joinedVehicle = null;
let joining = false;
let sequence = 0;

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) { const error = new Error(body?.message || body?.msg || `Request failed (${response.status})`); error.status = response.status; throw error; }
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
async function accessToken() {
  if (!session) throw new Error('Sign in first.');
  if (session.expires_at * 1000 > Date.now() + 120000) return session.access_token;
  if (!refreshPromise) refreshPromise = request(backend + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  }).then(value => { storeSession(value); return value.access_token; }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function signOut() {
  disconnectWorld();
  try { if (session) await request(backend + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: anon, Authorization: 'Bearer ' + await accessToken() } }); }
  finally { storeSession(null); connection.save = 'Not connected'; connection.revision = 0; connection.home = null; connection.homesAvailable = null; connection.lastSaved = null; }
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
export function gameRequest(action,payload={}) {
 const accountId=connection.user?.id;
 const input={requestTime:Date.now(),...payload,requestId:payload.requestId||globalThis.crypto?.randomUUID?.()||('request-'+Date.now()+'-'+Math.random().toString(36).slice(2))};
 const request=gameQueue.then(()=>{if(accountId!==connection.user?.id)throw Error('Account changed. Please try again.');return executeGameRequest(action,input);});gameQueue=request.catch(()=>{});return request;
}
async function executeGameRequest(action, payload = {}) {
  const accountId=connection.user?.id;
  if(action==='save')payload={...payload,revision:connection.revision};
  try {
    const result = await request(server + '/api/game', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await accessToken() },
      body: JSON.stringify({ action, ...payload }),
    });
    if(accountId!==connection.user?.id)throw Error('Account changed while request was running.');
    if(action==='save'&&Number.isInteger(result.revision))connection.revision=result.revision;
    if(result.wallet&&(!connection.wallet||result.wallet.version>=connection.wallet.version))connection.wallet=result.wallet;
    connection.server = 'Connected'; connection.backend = 'Connected'; return result;
  } catch (error) { connection.error = error.message; throw error; }
}
export async function bootstrapAccount() {
  const data = await gameRequest('bootstrap');
  connection.home = data.home; connection.homesAvailable = data.homes.filter(home => home.available).length;
  connection.revision = data.save?.revision || 0;
  connection.lastSaved = data.save?.updatedAt || null;
  connection.save = data.save ? 'Saved on Backender' : 'Choose a home';
  connection.error = '';
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
  client.on('disconnect', () => { connection.presence = 'Disconnected'; connection.players = []; joinedVehicle = null; joining = false; });
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
