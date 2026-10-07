const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
export const PLACE_AD_BUCKET = 'place-ads';

function requireStorageConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('PlaceAd storage is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the frontend environment.');
  }
}

function encodeObjectPath(path) {
  return String(path || '').split('/').map(encodeURIComponent).join('/');
}

function extensionFor(file) {
  if (file?.type === 'image/png') return 'png';
  if (file?.type === 'image/webp') return 'webp';
  return 'jpg';
}

export function publicPlaceAdImageUrl(path) {
  if (!path) return '';
  if (!SUPABASE_URL) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${PLACE_AD_BUCKET}/${encodeObjectPath(path)}`;
}

export async function uploadPlaceAdImage({ file, playerId, billboardId, bookingDate }) {
  requireStorageConfig();
  if (!(file instanceof File)) throw new Error('Choose an ad image first.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use a PNG, JPG or WebP image.');
  if (!file.size || file.size > 2 * 1024 * 1024) throw new Error('Ad image must be 2 MB or smaller.');
  if (!playerId || !billboardId || !bookingDate) throw new Error('Ad booking details are incomplete.');

  const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${bookingDate}/${billboardId}/${playerId}-${uniqueId}.${extensionFor(file)}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${PLACE_AD_BUCKET}/${encodeObjectPath(path)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: file,
  });
  if (!response.ok) {
    let details = '';
    try { details = await response.text(); } catch {}
    throw new Error(`Ad image upload failed (${response.status})${details ? `: ${details.slice(0, 120)}` : ''}`);
  }
  return { imagePath: path, imageUrl: publicPlaceAdImageUrl(path) };
}
