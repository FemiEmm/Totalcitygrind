import { PROTOCOL_VERSION, WORLD_ID, VEHICLE_IDS, type JoinRequest, type MoveRequest, type Pose } from './protocol.js';
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function parsePose(input: unknown): Pose | null {
  if (!record(input)) return null;
  const { x, y, rotation, speed } = input;
  // Matches the current 7680 x 4320 map including the northern residential extension.
  if (!finite(x) || !finite(y) || !finite(rotation) || !finite(speed)) return null;
  if (x < -120 || x > 7800 || y < -8280 || y > 4440 || Math.abs(speed) > 650 || Math.abs(rotation) > 1e6) return null;
  return { x, y, speed, rotation: ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) };
}
export function parseJoin(input: unknown): JoinRequest | null {
  if (!record(input) || input.protocolVersion !== PROTOCOL_VERSION || input.worldId !== WORLD_ID) return null;
  if (typeof input.name !== 'string' || input.name.length > 40) return null;
  const name = input.name.trim();
  if (name.length < 1 || name.length > 24 || /[<>\p{Cc}\p{Cf}]/u.test(name)) return null;
  if (!VEHICLE_IDS.some(id => id === input.vehicleId)) return null;
  const pose = parsePose(input.pose);
  if (!pose) return null;
  return { protocolVersion: PROTOCOL_VERSION, worldId: WORLD_ID, name, vehicleId: input.vehicleId as JoinRequest['vehicleId'], pose };
}
export function parseMove(input: unknown): MoveRequest | null {
  if (!record(input) || !Number.isSafeInteger(input.sequence) || (input.sequence as number) < 0) return null;
  const pose = parsePose(input);
  return pose ? { ...pose, sequence: input.sequence as number } : null;
}
export class RateLimit {
  private tokens: number;
  private updated = performance.now();
  constructor(private readonly perSecond: number, private readonly capacity: number) { this.tokens = capacity; }
  take(): boolean {
    const now = performance.now();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.updated) * this.perSecond / 1000);
    this.updated = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}
