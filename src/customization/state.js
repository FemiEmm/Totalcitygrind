import { STICKERS, PAINTS, PHONES } from './catalogue.js';

const catalogues = { sticker: STICKERS, paint: PAINTS, phone: PHONES };
export function createCustomizationState() {
  return { owned: { sticker: [], paint: [], phone: [] }, vehicles: {}, phone: null };
}

export function restoreCustomizationState(state, saved) {
  const clean = createCustomizationState();
  for (const kind of Object.keys(catalogues)) {
    const owned = Array.isArray(saved?.owned?.[kind]) ? saved.owned[kind] : [];
    clean.owned[kind] = catalogues[kind].filter(item => owned.includes(item.id)).map(item => item.id);
  }
  for (const [vehicleId, selection] of Object.entries(saved?.vehicles ?? {})) {
    if (!/^[a-z0-9-]+$/.test(vehicleId) || ['__proto__', 'constructor', 'prototype'].includes(vehicleId)) continue;
    clean.vehicles[vehicleId] = {};
    for (const kind of ['sticker', 'paint']) {
      clean.vehicles[vehicleId][kind] = clean.owned[kind].includes(selection?.[kind]) ? selection[kind] : null;
    }
  }
  clean.phone = clean.owned.phone.includes(saved?.phone) ? saved.phone : null;
  Object.assign(state, clean);
}

// The caller charges the returned catalogue price synchronously after validation.
export function applyCustomization(state, vehicleId, kind, id, money) {
  if (!Object.hasOwn(catalogues, kind) || !vehicleId || ['__proto__', 'constructor', 'prototype'].includes(vehicleId)) return { ok: false };
  const item = id === null ? null : catalogues[kind].find(entry => entry.id === id);
  if (id !== null && !item) return { ok: false };
  state.owned[kind] ??= [];
  const price = item && !state.owned[kind].includes(id) ? item.price : 0;
  if (!Number.isFinite(money) || (price > 0 && money < price)) return { ok: false };
  if (price > 0) state.owned[kind].push(id);
  if (kind === 'phone') state.phone = id;
  else {
    state.vehicles[vehicleId] ??= { sticker: null, paint: null };
    state.vehicles[vehicleId][kind] = id;
  }
  return { ok: true, price, label: item?.name ?? (kind === 'phone' ? 'Original phone' : kind === 'paint' ? 'Original paint' : 'No sticker') };
}
