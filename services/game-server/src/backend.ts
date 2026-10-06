export interface Profile {
  id: string;
  display_name: string;
  money: number;
  owned_vehicle_ids: string[];
  inventory: Record<string, unknown>;
  customization: Record<string, unknown>;
  progression: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
export interface Identity { id: string; profile: Profile; }
const provider=process.env.BACKEND_PROVIDER || 'backender';
if(!['backender','supabase'].includes(provider)) throw new Error('Unsupported BACKEND_PROVIDER');
const configuredUrl=process.env.BACKEND_URL || 'http://127.0.0.1:3001';
const url=configuredUrl.endsWith('/') ? configuredUrl.slice(0,-1) : configuredUrl;
const anon=process.env.BACKEND_ANON_KEY;
const service=process.env.BACKEND_SERVICE_ROLE_KEY;
export const requireAuth=process.env.REQUIRE_AUTH !== 'false';
if(requireAuth && !anon) throw new Error('Set BACKEND_ANON_KEY in .env, or explicitly use REQUIRE_AUTH=false for guest development');
async function request<T>(path: string, token: string, method='GET', payload?: unknown, privileged=false): Promise<T> {
  const key=privileged?service:anon;
  if(!key) throw new Error('Backend key not configured');
  const response=await fetch(url+path,{method,signal:AbortSignal.timeout(5000),headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:payload===undefined?undefined:JSON.stringify(payload)});
  if(!response.ok) throw new Error('Backend request failed ('+response.status+')');
  return await response.json() as T;
}
export async function authenticatePlayer(token: string): Promise<Identity> {
  const user=await request<{id:string}>('/auth/v1/user',token);
  if(typeof user.id!=='string') throw new Error('Invalid backend identity');
  const rows=await request<Profile[]>('/rest/v1/profiles?id=eq.'+encodeURIComponent(user.id)+'&select=*',token);
  const profile=rows[0];
  if(!profile || profile.id!==user.id || typeof profile.display_name!=='string' || !Array.isArray(profile.owned_vehicle_ids)) throw new Error('Player profile is missing');
  return {id:user.id,profile};
}
// Use only after a server-authoritative gameplay action; never expose a raw client patch event.
export async function updatePlayerProfile(id: string, patch: Partial<Pick<Profile,'display_name'|'money'|'owned_vehicle_ids'|'inventory'|'customization'|'progression'>>): Promise<Profile> {
  if(!service) throw new Error('Private backend service key is not configured');
  const rows=await request<Profile[]>('/rest/v1/profiles?id=eq.'+encodeURIComponent(id),service,'PATCH',patch,true);
  const row=rows[0];if(!row) throw new Error('Player profile not found');return row;
}
