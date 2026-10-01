const SAVE_STORAGE_KEY = "total-city-grind-fresh-v2";
const ACTIVE_SAVE_SLOT_STORAGE_KEY = "total-city-grind-active-save-slot-v2";

export const SAVE_SLOT_IDS = Object.freeze([1, 2, 3]);

export function normaliseSaveSlotId(value) {
  const slotId = Number(value);
  return SAVE_SLOT_IDS.includes(slotId) ? slotId : 1;
}

export function getActiveSaveSlotId() {
  if (typeof window === "undefined") return 1;
  return normaliseSaveSlotId(
    window.localStorage.getItem(ACTIVE_SAVE_SLOT_STORAGE_KEY),
  );
}

export function setActiveSaveSlotId(value) {
  const slotId = normaliseSaveSlotId(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      ACTIVE_SAVE_SLOT_STORAGE_KEY,
      String(slotId),
    );
  }
  return slotId;
}

export function getSaveStorageKey(value = getActiveSaveSlotId()) {
  const slotId = normaliseSaveSlotId(value);
  return `${SAVE_STORAGE_KEY}-slot-${slotId}`;
}

export function getSlotStorageKey(namespace, value = getActiveSaveSlotId()) {
  return `${namespace}-v2-slot-${normaliseSaveSlotId(value)}`;
}

export function clearSaveSlot(value = getActiveSaveSlotId()) {
  if (typeof window === "undefined") return;
  const slotId = normaliseSaveSlotId(value);
  const saveKey = getSaveStorageKey(slotId);
  const inventoryKey = getSlotStorageKey("total-city-grind-player-inventory", slotId);
  window.localStorage.removeItem(saveKey);
  window.localStorage.removeItem(inventoryKey);
}

function readSave(value) {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(
      window.localStorage.getItem(getSaveStorageKey(value)) || "null",
    );
  } catch {
    return null;
  }
}

export function getSaveSlots() {
  return SAVE_SLOT_IDS.map((id) => {
    const save = readSave(id);
    const state = save?.world2State ?? save;
    return {
      id,
      label: `SAVE ${id}`,
      exists: Boolean(save?.version === 1),
      savedAt: save?.savedAt ?? state?.savedAt ?? null,
      day: Number(state?.gameClock?.day ?? 1),
      money: Number(state?.economyState?.money ?? 0),
      location:
        save?.currentMapId === "coastal-city"
          ? "Coast City"
          : "Mainland Lagos",
    };
  });
}
