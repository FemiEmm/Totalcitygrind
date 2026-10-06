import { randomUUID } from 'node:crypto';
import { MAP_ID, PROTOCOL_VERSION, WORLD_ID, type JoinRequest, type MoveRequest, type PlayerState, type WorldSnapshot } from './protocol.js';
interface Session { player: PlayerState; clock: number; travelBudget: number; }
export class World {
  private sessions = new Map<string, Session>();
  private tick = 0;
  constructor(readonly capacity: number) {}
  get size(): number { return this.sessions.size; }
  get socketIds(): string[] { return [...this.sessions.keys()]; }
  has(socketId: string): boolean { return this.sessions.has(socketId); }
  hasPlayer(id: string): boolean { return [...this.sessions.values()].some(session => session.player.id === id); }
  join(socketId: string, request: JoinRequest, accountId?: string): PlayerState | null {
    if (this.sessions.has(socketId) || this.size >= this.capacity || (accountId !== undefined && this.hasPlayer(accountId))) return null;
    const player: PlayerState = { ...request.pose, id: accountId ?? randomUUID(), name: request.name, vehicleId: request.vehicleId, sequence: -1, updatedAt: Date.now() };
    this.sessions.set(socketId, { player, clock: performance.now(), travelBudget: 130 });
    return { ...player };
  }
  move(socketId: string, request: MoveRequest): 'NOT_JOINED' | 'STALE_SEQUENCE' | 'MOVEMENT_REJECTED' | null {
    const session = this.sessions.get(socketId);
    if (!session) return 'NOT_JOINED';
    if (request.sequence <= session.player.sequence) return 'STALE_SEQUENCE';
    const now = performance.now();
    // Bound travel over time instead of granting a teleport allowance per packet.
    session.travelBudget = Math.min(1300, session.travelBudget + (now - session.clock) * .65);
    session.clock = now;
    const distance = Math.hypot(request.x-session.player.x, request.y-session.player.y);
    if (distance > session.travelBudget) return 'MOVEMENT_REJECTED';
    session.travelBudget -= distance;
    Object.assign(session.player, request, { updatedAt: Date.now() });
    return null;
  }
  leave(socketId: string): string | null {
    const id = this.sessions.get(socketId)?.player.id ?? null;
    this.sessions.delete(socketId);
    return id;
  }
  snapshot(advance = false): WorldSnapshot {
    if (advance) this.tick++;
    const serverTime = Date.now();
    return { protocolVersion: PROTOCOL_VERSION, worldId: WORLD_ID, mapId: MAP_ID, tick: this.tick, serverTime,
      players: [...this.sessions.values()].map(({player}) => ({...player, speed: serverTime-player.updatedAt > 1500 ? 0 : player.speed})) };
  }
}
