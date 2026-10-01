import { BUSINESS_CONFIG } from "../data/businessAssets.js";

export function createBusinessState(startingDay = 1) {
  return {
    officeOwned: false,
    officePurchasedDay: null,
    assetCounts: {
      "fleet-danfo": 0,
      "lease-car": 0,
    },
    lastProcessedDay: startingDay,
    lifetimeGross: 0,
    lifetimeCosts: 0,
    lifetimeProfit: 0,
  };
}

export function restoreBusinessState(state, savedState, currentDay) {
  if (!savedState) {
    state.lastProcessedDay = currentDay;
    return;
  }
  state.officeOwned = Boolean(savedState.officeOwned);
  state.officePurchasedDay = savedState.officePurchasedDay ?? null;
  Object.assign(state.assetCounts, savedState.assetCounts ?? {});
  state.lastProcessedDay =
    Number(savedState.lastProcessedDay) || currentDay;
  state.lifetimeGross = Number(savedState.lifetimeGross) || 0;
  state.lifetimeCosts = Number(savedState.lifetimeCosts) || 0;
  state.lifetimeProfit = Number(savedState.lifetimeProfit) || 0;
}

export function purchaseBusinessOffice({
  state,
  money,
  currentDay,
  ownedPropertyIds,
}) {
  if (
    state.officeOwned ||
    money < BUSINESS_CONFIG.officePrice ||
    !ownedPropertyIds.includes(
      BUSINESS_CONFIG.officeRequirementPropertyId,
    )
  ) {
    return { success: false, amount: 0 };
  }

  state.officeOwned = true;
  state.officePurchasedDay = currentDay;
  state.lastProcessedDay = currentDay;
  return { success: true, amount: BUSINESS_CONFIG.officePrice };
}

export function purchaseBusinessAsset({ state, assetId, money }) {
  const asset = BUSINESS_CONFIG.assets.find((item) => item.id === assetId);
  const owned = state.assetCounts[assetId] ?? 0;
  if (
    !state.officeOwned ||
    !asset ||
    owned >= asset.maximumOwned ||
    money < asset.purchasePrice
  ) {
    return { success: false, amount: 0, asset: null };
  }

  state.assetCounts[assetId] = owned + 1;
  return { success: true, amount: asset.purchasePrice, asset };
}

export function processBusinessDay({ state, currentDay }) {
  const elapsedDays = Math.max(0, currentDay - state.lastProcessedDay);
  state.lastProcessedDay = currentDay;
  if (!state.officeOwned || elapsedDays === 0) return null;

  let grossPerDay = 0;
  let costsPerDay = 0;
  BUSINESS_CONFIG.assets.forEach((asset) => {
    const count = state.assetCounts[asset.id] ?? 0;
    grossPerDay += asset.dailyGross * count;
    costsPerDay += asset.dailyCosts * count;
  });

  const gross = grossPerDay * elapsedDays;
  const costs = costsPerDay * elapsedDays;
  const profit = gross - costs;
  state.lifetimeGross += gross;
  state.lifetimeCosts += costs;
  state.lifetimeProfit += profit;
  return { elapsedDays, gross, costs, profit };
}

export function getBusinessSummary(state) {
  let dailyGross = 0;
  let dailyCosts = 0;
  BUSINESS_CONFIG.assets.forEach((asset) => {
    const count = state.assetCounts[asset.id] ?? 0;
    dailyGross += asset.dailyGross * count;
    dailyCosts += asset.dailyCosts * count;
  });
  return {
    officeOwned: state.officeOwned,
    assetCounts: { ...state.assetCounts },
    dailyGross,
    dailyCosts,
    dailyProfit: dailyGross - dailyCosts,
    lifetimeProfit: state.lifetimeProfit,
  };
}
