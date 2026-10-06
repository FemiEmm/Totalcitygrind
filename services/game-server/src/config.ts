function integer(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(name + ' is out of range');
  return value;
}
export const config = {
  host: process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1'),
  port: integer('PORT', 3000, 1, 65535),
  maxPlayers: integer('MAX_PLAYERS', 100, 2, 100),
  snapshotHz: integer('SNAPSHOT_HZ', 10, 1, 30),
  origins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173').split(',').map(s => s.trim()).filter(Boolean),
  allowNullOrigin: process.env.ALLOW_NULL_ORIGIN === 'true',
};
export function allowedOrigin(origin: string | undefined): boolean {
  // Non-browser local clients omit Origin. Origin filtering is not authentication.
  return origin === undefined || (origin === 'null' ? config.allowNullOrigin : config.origins.includes(origin));
}
