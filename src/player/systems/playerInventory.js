import { getSlotStorageKey } from "../../game/saveSlots.js";

const INVENTORY_STORAGE_NAMESPACE = "total-city-grind-player-inventory";

function inventoryStorageKey() {
  return getSlotStorageKey(INVENTORY_STORAGE_NAMESPACE);
}

function normaliseInventory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([itemId, quantity]) => [
        itemId,
        Math.max(0, Math.floor(Number(quantity) || 0)),
      ])
      .filter(([, quantity]) => quantity > 0),
  );
}

// Seed only from the explicit new-game flow, never when loading or travelling.
export function startNewPlayerInventory() {
  const inventory = { items: { bread: 2, "bottled-water": 1 } };
  savePlayerInventory(inventory);
  return inventory;
}

export function createPlayerInventoryState() {
  if (typeof window === "undefined") {
    return { items: {} };
  }

  try {
    return {
      items: normaliseInventory(
        JSON.parse(window.localStorage.getItem(inventoryStorageKey())),
      ),
    };
  } catch {
    return { items: {} };
  }
}

export function savePlayerInventory(inventoryState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    inventoryStorageKey(),
    JSON.stringify(normaliseInventory(inventoryState.items)),
  );
}

export function addInventoryItem(inventoryState, itemId, quantity = 1) {
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  inventoryState.items[itemId] =
    (inventoryState.items[itemId] ?? 0) + safeQuantity;
  savePlayerInventory(inventoryState);
}

export function consumeInventoryItem(inventoryState, itemId) {
  const currentQuantity = inventoryState.items[itemId] ?? 0;

  if (currentQuantity <= 0) {
    return false;
  }

  if (currentQuantity === 1) {
    delete inventoryState.items[itemId];
  } else {
    inventoryState.items[itemId] = currentQuantity - 1;
  }

  savePlayerInventory(inventoryState);
  return true;
}
