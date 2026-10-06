import type { IncomingMessage, ServerResponse } from 'node:http';
import { authenticatePlayer } from './backend.js';
const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const requests = new Map<string, { count: number; until: number }>();
const stoppedPoseEconomyOps = new Set(['transport-stop', 'transport-route', 'fuel', 'food', 'vehicle', 'business-office', 'bank-loan', 'driving-test', 'health']);
setInterval(() => { for (const [id, bucket] of requests) if (bucket.until < Date.now()) requests.delete(id); }, 60000).unref();
export async function handleGameApi(req: IncomingMessage, res: ServerResponse, onAccountDeleted: (playerId: string) => void = () => {}, getCareerContext: (playerId: string, targetId?: string, stopTime?: number) => Record<string, unknown> = () => ({})): Promise<void> {
  const send = (status: number, data: unknown) => { res.writeHead(status); res.end(JSON.stringify(data)); };
  try {
    const token = req.headers.authorization?.replace(/^Bearer /i, '');
    if (!token || token.length > 4096) { send(401, { message: 'Sign in first' }); return; }
    let identity;
    try { identity = await authenticatePlayer(token); } catch { send(401, { message: 'Login expired or Backender unavailable' }); return; }
    const now = Date.now();
    let bucket = requests.get(identity.id);
    if (!bucket || bucket.until < now) { bucket = { count: 0, until: now + 60000 }; requests.set(identity.id, bucket); }
    if (++bucket.count > 120) { send(429, { message: 'Too many account requests. Try again shortly.' }); return; }
    let size = 0; const chunks: Buffer[] = [];
    for await (const chunk of req) { size += chunk.length; if (size > 2 * 1024 * 1024) { send(413, { message: 'Save is too large' }); return; } chunks.push(chunk); }
    let input;
    try { input = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { send(400, { message: 'Invalid JSON' }); return; }
    if (!input || !['bootstrap', 'claim', 'save', 'rankings', 'police-bay', 'delete-account', 'career', 'government', 'club', 'housing', 'heist', 'passengers', 'economy'].includes(input.action)) { send(400, { message: 'Invalid action' }); return; }
    const service = process.env.BACKEND_SERVICE_ROLE_KEY;
    if (!service) { send(503, { message: 'Configure the server private backend key' }); return; }
    const response = await fetch(backendUrl + '/rest/v1/rpc/game_state', { method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, playerId: identity.id, serverPose: null, serverTarget: null, serverTruckBayBlocked: true, ...(['career','government','club','housing','heist','passengers','economy'].includes(input.action) ? getCareerContext(identity.id, input.targetId, input.action === 'economy' && stoppedPoseEconomyOps.has(input.op) ? input.requestTime : undefined) : {}) }) });
    const result = await response.json();
    if (response.ok && input.action === 'delete-account' && result.deleted === true) onAccountDeleted(identity.id);
    send(response.status, result);
  } catch { if (!res.headersSent) send(503, { message: 'Backender is unavailable. Your local save is retained.' }); }
}
