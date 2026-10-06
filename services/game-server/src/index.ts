import './production.js';
import { handleGameApi } from './gameApi.js';
import { authenticatePlayer, requireAuth, type Identity } from './backend.js';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { allowedOrigin, config } from './config.js';
import { MAP_ID, PROTOCOL_VERSION, WORLD_ID, type ClientEvents, type ErrorCode, type ServerEvents } from './protocol.js';
import { parseJoin, parseMove, RateLimit } from './validation.js';
import { World } from './world.js';

const world = new World(config.maxPlayers);
let stopping = false;
const http = createServer((req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!allowedOrigin(origin)) { res.writeHead(403); res.end(JSON.stringify({error:'Origin not allowed'})); return; }
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url === '/api/game' && req.method === 'POST') { void handleGameApi(req, res, playerId => {
    for (const socket of io.of('/').sockets.values()) {
      if (socket.data.identity?.id === playerId) socket.disconnect(true);
    }
  }, (playerId, targetId) => {
    const players=world.snapshot().players;
    const fresh=(id: string | undefined)=>players.find(p=>p.id===id && Date.now()-p.updatedAt<3000) || null;
    return {serverPose:fresh(playerId),serverTarget:fresh(targetId),serverTruckBayBlocked:players.some(p=>p.id!==playerId && Math.abs(p.x-59*120)<150 && Math.abs(p.y+6*120)<270)};
  }); return; }
  if (req.method !== 'GET') { res.writeHead(405, {Allow:'GET'}); res.end(JSON.stringify({error:'Method not allowed'})); return; }
  const route = (req.url ?? '').split('?')[0];
  if (route === '/health') {
    res.writeHead(stopping ? 503 : 200);
    res.end(JSON.stringify({status:stopping?'stopping':'ok',name:'Total City Grind Game Server',version:'0.1.0',protocolVersion:PROTOCOL_VERSION,uptimeSeconds:Math.floor(process.uptime()),players:world.size}));
  } else if (route === '/worlds') {
    res.end(JSON.stringify({worlds:[{id:WORLD_ID,mapId:MAP_ID,name:'Lagos Mainland 01',players:world.size,capacity:world.capacity}]}));
  } else { res.writeHead(404); res.end(JSON.stringify({error:'Not found'})); }
});
http.requestTimeout = 10_000;
http.headersTimeout = 10_000;
const io = new Server<ClientEvents, ServerEvents>(http, {
  cors: {origin:(origin,callback)=>callback(null,allowedOrigin(origin)),methods:['GET','POST']},
  allowRequest: (request, callback) => callback(null, allowedOrigin(request.headers.origin)),
  maxHttpBufferSize: 4096,
  serveClient: false,
  perMessageDeflate: false,
});
io.use(async(socket, next) => {
  if(stopping || io.of('/').sockets.size >= config.maxPlayers*2) return next(new Error('Server connection limit reached'));
  const token=socket.handshake.auth?.token;
  if(!token && !requireAuth) return next();
  if(typeof token!=='string'||token.length>4096) return next(new Error('Login required'));
  try {
    socket.data.identity=await authenticatePlayer(token);
    if(stopping || io.of('/').sockets.size >= config.maxPlayers*2) return next(new Error('Server connection limit reached'));
    next();
  } catch { next(new Error('Login expired or backend unavailable')); }
});
io.on('connection', socket => {
  const identity=socket.data.identity as Identity | undefined;
  let checkingSession=false;
  const sessionTimer=identity ? setInterval(async()=>{
    if(checkingSession || !socket.connected) return;
    checkingSession=true;
    try { await authenticatePlayer(socket.handshake.auth.token as string); }
    catch { socket.disconnect(true); }
    finally { checkingSession=false; }
  },60_000) : null;
  sessionTimer?.unref();
  const movementLimit = new RateLimit(20, 30);
  const actionLimit = new RateLimit(2, 4);
  const errorLimit = new RateLimit(1, 3);
  const replyError = (code: ErrorCode, message: string, ack?: unknown) => {
    const error = {code,message};
    if (typeof ack === 'function') ack({ok:false,error});
    else if (errorLimit.take()) socket.emit('server:error', error);
  };
  let joinTimer: ReturnType<typeof setTimeout>;
  const scheduleJoinTimeout = () => {
    clearTimeout(joinTimer);
    joinTimer = setTimeout(() => { if (!world.has(socket.id)) socket.disconnect(true); }, 15_000);
    joinTimer.unref();
  };
  scheduleJoinTimeout();
  const leave = (reason: string) => {
    const playerId = world.leave(socket.id);
    if (playerId && world.size) io.to(world.socketIds).emit('player:left', {playerId,reason});
  };
  socket.on('world:join', async (raw, ack) => {
    if (!actionLimit.take()) return replyError('RATE_LIMITED','Too many join requests',ack);
    if (typeof ack !== 'function') return replyError('INVALID_REQUEST','Join requires an acknowledgement callback');
    const request = parseJoin(raw);
    if (!request) return replyError('INVALID_REQUEST','Invalid world, protocol, name, vehicle or pose',ack);
    if (world.has(socket.id)) return replyError('ALREADY_JOINED','Leave before joining again',ack);
    if(identity) {
      try { identity.profile = (await authenticatePlayer(socket.handshake.auth.token as string)).profile; }
      catch { return replyError('INVALID_REQUEST','Sign in again; the backend session is unavailable',ack); }
      if (!socket.connected || world.has(socket.id)) return replyError('ALREADY_JOINED','Connection already joined or closed',ack);
      if(world.hasPlayer(identity.id)) return replyError('ALREADY_JOINED','This account is already in the world',ack);
      if(request.vehicleId !== identity.profile.progression.activeServiceVehicle && !identity.profile.owned_vehicle_ids.includes(request.vehicleId) && !(request.vehicleId === 'player-brt' && identity.profile.progression.selectedJob === 'brt')) return replyError('INVALID_REQUEST','Vehicle is not owned by this account',ack);
      request.name=identity.profile.display_name;
    }
    const player = world.join(socket.id,request,identity?.id);
    if (!player) return replyError('WORLD_FULL','This world is full',ack);
    clearTimeout(joinTimer);
    ack({ok:true,data:{...world.snapshot(),playerId:player.id,snapshotHz:config.snapshotHz,maxPlayers:config.maxPlayers}});
    const peers=world.socketIds.filter(id=>id!==socket.id);
    if (peers.length) io.to(peers).emit('player:joined',player);
  });
  socket.on('player:move', (raw, ack) => {
    if (!movementLimit.take()) return replyError('RATE_LIMITED','Send movement at 10 updates per second',ack);
    const request=parseMove(raw);
    if (!request) return replyError('INVALID_REQUEST','Invalid movement payload',ack);
    const error=world.move(socket.id,request);
    if (error) return replyError(error,'Movement was not accepted',ack);
    if (typeof ack==='function') ack({ok:true,data:{sequence:request.sequence}});
  });
  socket.on('world:leave', ack => {
    if (!actionLimit.take()) return replyError('RATE_LIMITED','Too many requests',ack);
    leave('left');
    scheduleJoinTimeout();
    if (typeof ack==='function') ack({ok:true,data:null});
  });
  socket.on('disconnect',()=>{clearTimeout(joinTimer);if(sessionTimer) clearInterval(sessionTimer);leave('disconnected');});
  socket.on('error', error=>console.error('Socket error:',error.message));
});
const snapshotTimer=setInterval(()=>{
  if(world.size) io.to(world.socketIds).volatile.emit('world:snapshot',world.snapshot(true));
},1000/config.snapshotHz);
snapshotTimer.unref();
function shutdown() {
  if(stopping) return;
  stopping=true;
  clearInterval(snapshotTimer);
  io.emit('server:shutdown');
  io.close(()=>process.exit(0));
  setTimeout(()=>process.exit(1),5000).unref();
}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
http.on('error', error=>{console.error('Server could not listen:',error.message);process.exit(1);});
http.listen(config.port,config.host,()=>{
  console.log('Total City Grind Game Server: http://'+config.host+':'+config.port);
  console.log((requireAuth?'Account':'Guest')+' driving prototype | '+WORLD_ID+' | '+config.maxPlayers+' players maximum');
});
