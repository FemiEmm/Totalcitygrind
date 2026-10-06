export const PROTOCOL_VERSION = 1;
export const WORLD_ID = 'lagos-mainland-01';
export const MAP_ID = 'mainland';
export const VEHICLE_IDS = ['starter-danfo', 'eko-compact', 'mainland-hatch', 'lagoon-sedan', 'island-cruiser', 'victoria-executive', 'player-brt', 'service-police', 'service-lastma', 'service-lawma'] as const;
export type VehicleId = typeof VEHICLE_IDS[number];
export interface Pose { x: number; y: number; rotation: number; speed: number; }
export interface JoinRequest {
  protocolVersion: 1;
  worldId: typeof WORLD_ID;
  name: string;
  vehicleId: VehicleId;
  pose: Pose;
}
export interface MoveRequest extends Pose { sequence: number; }
export interface PlayerState extends Pose {
  id: string;
  name: string;
  vehicleId: VehicleId;
  sequence: number;
  updatedAt: number;
}
export interface WorldSnapshot {
  protocolVersion: 1;
  worldId: typeof WORLD_ID;
  mapId: typeof MAP_ID;
  tick: number;
  serverTime: number;
  players: PlayerState[];
}
export interface Welcome extends WorldSnapshot { playerId: string; snapshotHz: number; maxPlayers: number; }
export type ErrorCode = 'INVALID_REQUEST' | 'WORLD_FULL' | 'ALREADY_JOINED' | 'NOT_JOINED' | 'RATE_LIMITED' | 'STALE_SEQUENCE' | 'MOVEMENT_REJECTED';
export type Result<T = null> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
export type Ack<T = null> = (result: Result<T>) => void;
export interface ClientEvents {
  'world:join': (request: JoinRequest, ack: Ack<Welcome>) => void;
  'player:move': (request: MoveRequest, ack?: Ack<{ sequence: number }>) => void;
  'world:leave': (ack?: Ack) => void;
}
export interface ServerEvents {
  'world:snapshot': (snapshot: WorldSnapshot) => void;
  'player:joined': (player: PlayerState) => void;
  'player:left': (event: { playerId: string; reason: string }) => void;
  'server:error': (error: { code: ErrorCode; message: string }) => void;
  'server:shutdown': () => void;
}
